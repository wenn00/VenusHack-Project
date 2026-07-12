"""FastAPI entry point for the rPPG service.

Endpoints:
    GET  /health    -> liveness probe (also used to wake the dyno before demo)
    POST /measure   -> accept an mp4/mov upload and return BPM + HRV + confidence
"""

from __future__ import annotations

import os
import uuid
from contextlib import suppress

import anyio.to_thread
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from rppg import RppgError, process_video

# A 20 s 720p clip is ~10-20 MB; anything bigger is not a legitimate
# measurement. The Render free dyno has 512 MB of RAM, so uploads must be
# bounded and streamed to disk rather than buffered whole.
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
READ_CHUNK_BYTES = 1024 * 1024

app = FastAPI(title="Kairos rPPG API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Hackathon-only; tighten before production.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/measure")
async def measure(video: UploadFile = File(...)) -> dict[str, object]:
    temp_path = f"/tmp/{uuid.uuid4().hex}.mp4"
    try:
        size = 0
        with open(temp_path, "wb") as f:
            while chunk := await video.read(READ_CHUNK_BYTES):
                size += len(chunk)
                if size > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=413,
                        detail={
                            "code": "VIDEO_TOO_LARGE",
                            "message": "Video upload is too large. Please record a normal 20-second measurement.",
                        },
                    )
                f.write(chunk)
        # MediaPipe + POS over ~600 frames is CPU-bound for tens of seconds
        # on the 0.1-CPU dyno; run it off the event loop so /health (and the
        # app's server-ready ping) keeps responding during a measurement.
        result = await anyio.to_thread.run_sync(process_video, temp_path)
        return result
    except HTTPException:
        raise
    except RppgError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": str(e)})
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail={"code": "INTERNAL_ERROR", "message": str(e)}
        ) from e
    finally:
        with suppress(FileNotFoundError):
            os.remove(temp_path)
