"""Tests for the rPPG analysis pipeline (signal path, no video decoding).

Regression target: frames where face detection fails are dropped from the
signal but were previously still processed as uniformly sampled at fps,
compressing the time axis and inflating BPM by 1/(1 - drop_ratio).
"""

import numpy as np
import pytest

import rppg


FPS = 30.0
DURATION_S = 20
HEART_HZ = 1.2  # 72 BPM ground truth
N = int(FPS * DURATION_S)


def _synth_rgb(n: int = N, fps: float = FPS) -> np.ndarray:
    """Plausible face-ROI RGB means with a 72-BPM pulse riding on green."""
    t = np.arange(n) / fps
    rng = np.random.default_rng(7)
    pulse = np.sin(2 * np.pi * HEART_HZ * t)
    return np.stack(
        [
            120 + 0.4 * pulse + rng.normal(0, 0.05, n),
            100 + 1.0 * pulse + rng.normal(0, 0.05, n),
            90 + 0.2 * pulse + rng.normal(0, 0.05, n),
        ],
        axis=1,
    )


def _drop_frames(rgb: np.ndarray, drop_ratio: float, seed: int = 7):
    """Simulate intermittent face detection: keep a random subset of frames,
    returning (kept_rgb, kept_timestamps) the way _extract_face_rgb now does."""
    rng = np.random.default_rng(seed)
    keep = rng.random(len(rgb)) > drop_ratio
    timestamps = np.arange(len(rgb)) / FPS
    return rgb[keep], timestamps[keep]


def test_full_signal_estimates_ground_truth_bpm():
    rgb = _synth_rgb()
    timestamps = np.arange(N) / FPS
    result = rppg._analyze_signals(rgb, timestamps, FPS, total_frames=N)
    assert result["status"] == "success"
    assert abs(result["bpm"] - 72) <= 3


def test_dropped_frames_do_not_inflate_bpm():
    rgb = _synth_rgb()
    kept_rgb, kept_ts = _drop_frames(rgb, drop_ratio=0.25)
    result = rppg._analyze_signals(kept_rgb, kept_ts, FPS, total_frames=N)
    # Pre-fix behavior estimated ~1.33x ground truth (≈96 BPM) here.
    assert abs(result["bpm"] - 72) <= 4


def test_excessive_drop_ratio_raises_low_quality():
    rgb = _synth_rgb()
    kept_rgb, kept_ts = _drop_frames(rgb, drop_ratio=0.45)
    with pytest.raises(rppg.RppgError) as exc:
        rppg._analyze_signals(kept_rgb, kept_ts, FPS, total_frames=N)
    assert exc.value.code == "LOW_QUALITY_VIDEO"


def test_duration_reports_full_video_length():
    """duration_seconds is the video length, not the face-detected subset
    (matches the API contract in docs/07-rppg-plan.md)."""
    rgb = _synth_rgb()
    kept_rgb, kept_ts = _drop_frames(rgb, drop_ratio=0.25)
    result = rppg._analyze_signals(kept_rgb, kept_ts, FPS, total_frames=N)
    assert result["duration_seconds"] == pytest.approx(DURATION_S, abs=0.1)


def test_too_few_face_frames_raises_face_not_detected():
    rgb = _synth_rgb(n=90)
    timestamps = np.arange(90) / FPS
    with pytest.raises(rppg.RppgError) as exc:
        rppg._analyze_signals(rgb, timestamps, FPS, total_frames=90)
    assert exc.value.code == "FACE_NOT_DETECTED"
