"""FastAPI entry point for the rPPG service.

Endpoints:
    GET  /health    -> liveness probe (also used to wake the dyno before demo)
    POST /measure   -> accept an mp4/mov upload and return BPM + HRV + confidence
"""

from __future__ import annotations

import os
import uuid
from contextlib import suppress

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from rppg import RppgError, process_video

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
        contents = await video.read()
        with open(temp_path, "wb") as f:
            f.write(contents)
        result = process_video(temp_path)
        return result
    except RppgError as e:
        raise HTTPException(status_code=400, detail={"code": e.code, "message": str(e)})
    except Exception as e:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail={"code": "INTERNAL_ERROR", "message": str(e)}
        ) from e
    finally:
        with suppress(FileNotFoundError):
            os.remove(temp_path)
