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


def _waveform_rgb(bpm: float, harmonic: float, noise_sd: float, seed: int) -> np.ndarray:
    """Pulse at `bpm` plus a second harmonic of relative amplitude `harmonic`
    (real PPG waves are not sinusoids), with per-channel sensor noise."""
    t = np.arange(N) / FPS
    rng = np.random.default_rng(seed)
    hz = bpm / 60.0
    wave = np.sin(2 * np.pi * hz * t) + harmonic * np.sin(2 * np.pi * 2 * hz * t + 0.8)
    return np.stack(
        [
            120 + 0.4 * wave + rng.normal(0, noise_sd, N),
            100 + 1.0 * wave + rng.normal(0, noise_sd, N),
            90 + 0.2 * wave + rng.normal(0, noise_sd, N),
        ],
        axis=1,
    )


def _analyze(rgb: np.ndarray) -> dict:
    return rppg._analyze_signals(rgb, np.arange(len(rgb)) / FPS, FPS, total_frames=len(rgb))


@pytest.mark.parametrize("true_bpm", [67.5, 73.5, 88.5, 100.5])
def test_heart_rate_between_fft_bins_is_estimated_within_1_bpm(true_bpm):
    """A 20 s clip gives raw FFT bins 3 BPM apart; these rates sit halfway
    between bins, where the old estimate was off by 1.5 BPM."""
    result = _analyze(_waveform_rgb(true_bpm, harmonic=0.3, noise_sd=0.05, seed=1))
    assert abs(result["bpm"] - true_bpm) <= 1


@pytest.mark.parametrize("seed", range(5))
def test_dominant_second_harmonic_does_not_double_the_heart_rate(seed):
    """When the pulse's second harmonic outweighs the fundamental, the
    strongest peak sits at 2x the heart rate: a resting 70 read as 140 would
    raise a false alarm."""
    result = _analyze(_waveform_rgb(70.0, harmonic=1.3, noise_sd=0.3, seed=seed))
    assert abs(result["bpm"] - 70) <= 3


@pytest.mark.parametrize("seed", range(5))
def test_genuinely_fast_heart_rate_is_not_halved(seed):
    """Guard for the harmonic fix: a real 140 BPM has no power at 70, so it
    must not be "corrected" down to a reassuring number."""
    result = _analyze(_waveform_rgb(140.0, harmonic=0.3, noise_sd=0.6, seed=seed))
    assert abs(result["bpm"] - 140) <= 3


def _noise_rgb(seed: int) -> np.ndarray:
    rng = np.random.default_rng(1000 + seed)
    return np.array([120.0, 100.0, 90.0]) + rng.normal(0, 0.5, (N, 3))


@pytest.mark.parametrize("seed", range(20))
def test_noise_without_a_pulse_is_rejected(seed):
    """No pulse in the signal: the app must ask for a re-measure instead of
    reporting whatever noise peak happens to be largest."""
    with pytest.raises(rppg.RppgError) as exc:
        _analyze(_noise_rgb(seed))
    assert exc.value.code == "LOW_QUALITY_VIDEO"


@pytest.mark.parametrize("seed", range(5))
def test_noisy_but_clear_pulse_is_accepted(seed):
    """Guard against over-rejection: a pulse twice as strong as the sensor
    noise is plenty to read reliably and must not be refused."""
    result = _analyze(_waveform_rgb(78.0, harmonic=0.3, noise_sd=0.5, seed=seed))
    assert abs(result["bpm"] - 78) <= 2


@pytest.mark.parametrize("true_bpm", [190.0, 200.0, 210.0])
@pytest.mark.parametrize("seed", range(3))
def test_dangerously_fast_heart_rate_is_reported_not_halved_or_refused(true_bpm, seed):
    """A resting rate this fast (e.g. SVT) must surface. Searching only up to
    180 BPM made the app refuse it, or read a noise peak near half of it whose
    harmonic window swallowed the real peak — a falsely reassuring ~100."""
    result = _analyze(_waveform_rgb(true_bpm, harmonic=0.0, noise_sd=0.3, seed=seed))
    assert abs(result["bpm"] - true_bpm) <= 3


def _acceptance_rate(bpm: float, seeds: int = 60) -> float:
    # Noise level chosen so acceptance sits near the gate (~65%), where any
    # rate-dependent bias in the quality score shows up.
    accepted = 0
    for seed in range(seeds):
        try:
            _analyze(_waveform_rgb(bpm, harmonic=0.0, noise_sd=1.25, seed=seed))
            accepted += 1
        except rppg.RppgError:
            pass
    return accepted / seeds


def test_quality_gate_treats_fast_and_slow_heart_rates_alike():
    """Equally clean pulses must be refused equally often. Crediting the
    harmonic window as signal gave slow rates free noise power (the window of
    a fast rate falls outside the band), refusing a 140 BPM reading — the
    alert range — far more often than a 90 BPM one."""
    assert abs(_acceptance_rate(90.0) - _acceptance_rate(140.0)) <= 0.15


def test_implausibly_short_time_span_is_refused_not_crashed():
    """Corrupt container timestamps can squeeze 600 frames into half a second;
    that must be a "please re-measure", not an HTTP 500 from the filter."""
    with pytest.raises(rppg.RppgError) as exc:
        rppg._analyze_signals(_synth_rgb(), np.linspace(0.0, 0.5, N), FPS, total_frames=N)
    assert exc.value.code == "LOW_QUALITY_VIDEO"


def test_cleaner_signal_reports_higher_confidence():
    clean = _analyze(_waveform_rgb(78.0, harmonic=0.3, noise_sd=0.1, seed=4))
    weak = _analyze(_waveform_rgb(78.0, harmonic=0.3, noise_sd=1.0, seed=4))
    assert clean["confidence"] > weak["confidence"]


def test_too_few_face_frames_raises_face_not_detected():
    rgb = _synth_rgb(n=90)
    timestamps = np.arange(90) / FPS
    with pytest.raises(rppg.RppgError) as exc:
        rppg._analyze_signals(rgb, timestamps, FPS, total_frames=90)
    assert exc.value.code == "FACE_NOT_DETECTED"
