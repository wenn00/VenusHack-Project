"""API-contract tests for the /measure endpoint."""

from fastapi.testclient import TestClient

import main
from rppg import RppgError


client = TestClient(main.app)


def _post_video(payload: bytes):
    return client.post("/measure", files={"video": ("clip.mp4", payload, "video/mp4")})


def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_measure_success_passthrough(monkeypatch):
    result = {
        "status": "success",
        "bpm": 72,
        "hrv_ms": 40,
        "confidence": 0.9,
        "duration_seconds": 20.0,
        "frames_analyzed": 600,
    }
    monkeypatch.setattr(main, "process_video", lambda path: result)
    resp = _post_video(b"fake-bytes")
    assert resp.status_code == 200
    assert resp.json() == result


def test_measure_rejects_oversized_upload(monkeypatch):
    # The endpoint previously buffered the whole upload into RAM with no cap
    # (512 MB Render dyno): a single huge POST could OOM the process.
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 1024)
    called = []
    monkeypatch.setattr(main, "process_video", lambda path: called.append(path))
    resp = _post_video(b"x" * 4096)
    assert resp.status_code == 413
    body = resp.json()
    assert body["detail"]["code"] == "VIDEO_TOO_LARGE"
    assert called == []  # processing must not run on a rejected upload


def test_measure_maps_rppg_error_to_envelope(monkeypatch):
    # Characterization: the frontend parser (rppg-errors.ts) expects this
    # exact envelope; keep it stable.
    def boom(path):
        raise RppgError("FACE_NOT_DETECTED", "Couldn't reliably track a face in the video.")

    monkeypatch.setattr(main, "process_video", boom)
    resp = _post_video(b"fake-bytes")
    assert resp.status_code == 400
    assert resp.json() == {
        "detail": {
            "code": "FACE_NOT_DETECTED",
            "message": "Couldn't reliably track a face in the video.",
        }
    }


def test_measure_rejects_when_server_is_busy(monkeypatch):
    # With one measurement running and one waiting, a third caller must get
    # an immediate, recognisable "busy" instead of a 90 s+ timeout.
    from job_gate import GateFull

    class FullGate:
        def slot(self):
            raise GateFull()

    called = []
    monkeypatch.setattr(main, "gate", FullGate())
    monkeypatch.setattr(main, "process_video", lambda path: called.append(path))
    resp = _post_video(b"fake-bytes")
    assert resp.status_code == 429
    assert resp.json() == {
        "detail": {
            "code": "SERVER_BUSY",
            "message": "Someone else is measuring right now. Please try again in a minute.",
        }
    }
    assert called == []
