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


def test_frame_times_use_container_timestamps():
    """Phone and browser clips are variable-frame-rate: real gaps between
    frames differ from 1/fps, so idx/fps would distort the time axis."""
    times = rppg._frame_times([1000.0, 1040.0, 1073.0, 1107.0, 1150.0], fps=30.0)
    assert times == pytest.approx([0.0, 0.040, 0.073, 0.107, 0.150])


@pytest.mark.parametrize(
    "pos_msec",
    [
        [0.0, 0.0, 0.0, 0.0],  # backend reports no timestamps
        [0.0, 33.0, 33.0, 99.0],  # not strictly increasing
        [0.0, 33.0, float("nan"), 99.0],
    ],
)
def test_frame_times_fall_back_to_frame_rate_when_timestamps_unusable(pos_msec):
    times = rppg._frame_times(pos_msec, fps=25.0)
    assert times == pytest.approx([0.0, 0.04, 0.08, 0.12])


def test_variable_frame_rate_clip_estimates_true_bpm():
    """Frames arrive at an irregular ~24 fps while the container claims 30.
    With the real timestamps the estimate must not be scaled by 30/24."""
    rng = np.random.default_rng(3)
    gaps = rng.uniform(1 / 30, 1 / 20, size=480)
    t = np.concatenate([[0.0], np.cumsum(gaps)])
    t = t[t < DURATION_S]
    pulse = np.sin(2 * np.pi * HEART_HZ * t)
    rgb = np.stack(
        [120 + 0.4 * pulse, 100 + 1.0 * pulse + rng.normal(0, 0.05, len(t)), 90 + 0.2 * pulse],
        axis=1,
    )
    times = rppg._frame_times(list(t * 1000.0), fps=FPS)
    result = rppg._analyze_signals(rgb, times, FPS, total_frames=len(t))
    assert abs(result["bpm"] - 72) <= 1


def test_too_few_face_frames_raises_face_not_detected():
    rgb = _synth_rgb(n=90)
    timestamps = np.arange(90) / FPS
    with pytest.raises(rppg.RppgError) as exc:
        rppg._analyze_signals(rgb, timestamps, FPS, total_frames=90)
    assert exc.value.code == "FACE_NOT_DETECTED"
