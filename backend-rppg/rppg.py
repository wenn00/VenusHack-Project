"""rPPG core algorithm.

Pipeline:
    1. Read the video frames with their real capture timestamps.
    2. Detect the face on each frame using MediaPipe FaceMesh.
    3. Build an ROI mask covering forehead + cheeks and extract its RGB mean.
    4. Resample onto a uniform time grid, then apply the POS algorithm
       (Wang et al., 2017) to derive a 1-D rPPG signal.
    5. Bandpass filter to 0.7-4 Hz.
    6. Estimate heart rate from the strongest spectral peak in 45-180 BPM
       (harmonic-checked); refuse the reading when its SNR is too low.
       HRV via peak-interval RMSSD.

Returns a JSON-serialisable dict:
    {
        "status": "success",
        "bpm": int,
        "hrv_ms": int,
        "confidence": float,
        "duration_seconds": float,
        "frames_analyzed": int,
    }
"""

from __future__ import annotations

from typing import Iterator, Tuple

import cv2
import mediapipe as mp
import numpy as np
from scipy.signal import butter, filtfilt, find_peaks


class RppgError(Exception):
    """Domain error carrying a stable machine-readable code."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


# Indices into MediaPipe FaceMesh's 468 landmarks, in outline order, for the
# forehead + both cheeks. The forehead band runs from the mid-forehead ring
# down to the top edge of the eyebrows, staying clear of the hairline; each
# cheek sits below the eye and lateral to the nose. On the canonical face the
# areas are ~9.2 cm² (forehead) and ~7.9 cm² (each cheek) —
# tests/test_roi_geometry.py pins that they stay large and non-self-crossing.
FOREHEAD_LANDMARKS = [69, 108, 151, 337, 299, 296, 336, 9, 107, 66]
LEFT_CHEEK_LANDMARKS = [117, 118, 119, 100, 36, 205, 187, 123]
RIGHT_CHEEK_LANDMARKS = [346, 347, 348, 329, 266, 425, 411, 352]

# NOTE: FaceMesh is created per video (see _extract_face_rgb). A module-level
# instance in tracking mode (static_image_mode=False) carries landmark state
# from one request's last frame into the next request's first frames, and the
# solution object is not thread-safe — which matters now that main.py runs
# processing in a worker thread.


# Above this ratio of frames without a face detection, the reconstructed
# signal is too gappy to trust — interpolation would invent the waveform.
MAX_DROP_RATIO = 0.3

# Heart rates searched for: 45-240 BPM. The top must stay this high so a
# dangerously fast rate (e.g. SVT) is reported rather than refused or read as
# a noise peak near half of it; the pulse's second harmonic winning instead of
# the heart rate is handled by the half-frequency check in _estimate_bpm.
HR_SEARCH_HZ = (0.75, 4.0)
# Band the SNR's noise floor is measured over (matches the bandpass filter).
SNR_BAND_HZ = (0.7, 4.0)
# Below this much signal, after resampling, there are too few beats to read
# (and the bandpass filter cannot run) — only corrupt timestamps get here.
MIN_ANALYSIS_SECONDS = 10.0
# Frame timestamps and the frame rate both come from the uploaded file, so
# they must not set the amount of work: the signal is resampled to a fixed
# analysis rate (not the claimed frame rate), and clips claiming to last
# longer than MAX_CLIP_SECONDS are refused. Measurements are 20 s; a crafted
# clip claiming hours, or a million fps, would otherwise build a huge grid on
# the 512 MB server.
ANALYSIS_FS = 30.0
MAX_CLIP_SECONDS = 60.0
# Every decoded frame is run through face tracking (~80 ms each on the
# 0.1-CPU dyno) while other users wait on the single-job gate, and the 50 MB
# upload cap doesn't bound a near-blank video's frame count or size. 1200
# frames (20 s at 60 fps, 40 s at 30 fps) keeps the worst case near 100 s,
# inside the client's 150 s timeout; 1080p covers every capture path (native
# records 720p, web 640x480).
MAX_FRAMES = 1200
MAX_FRAME_PIXELS = 1920 * 1080
# Power at half the strongest frequency, as a share of the strongest peak's,
# above which the strongest peak is taken to be the harmonic. In synthetic
# tests 0.3 recovers harmonic-dominant 70 BPM pulses without halving real
# 140-160 BPM ones.
SUBHARMONIC_POWER_RATIO = 0.3
# Readings below this spectral SNR are refused ("please re-measure"). The
# strongest peak of pure noise scores well above 0 dB (it is the maximum of
# many bins), so the bar sits above that:
# - 3,000 synthetic pulse-free clips: 0.07% reached 9.5 dB (max 10.1 dB). A
#   pulse as strong as the sensor noise passes ~86% of the time, one 0.8x as
#   strong ~52%, with no accepted reading more than 3 BPM off.
# - H.264 variable-frame-rate clips of a real face: 12 pulse-free clips scored
#   4.1-8.5 dB (all refused; the old code reported 54-102 BPM for them). With
#   a synthetic pulse of 0.4 / 0.6 / >= 0.8 grey levels, 4/6, 5/6 and 6/6
#   clips passed, each within 1 BPM.
# Not tuned on real recordings with a reference heart rate (none exist yet);
# lowering this trades fewer "please re-measure" prompts for occasional
# invented readings.
MIN_SNR_DB = 9.5


def process_video(path: str) -> dict[str, object]:
    rgb_signals, timestamps, fps, total_frames = _extract_face_rgb(path)
    return _analyze_signals(rgb_signals, timestamps, fps, total_frames)


def _analyze_signals(
    rgb_signals: np.ndarray,
    timestamps: np.ndarray,
    fps: float,
    total_frames: int,
) -> dict[str, object]:
    """Turn per-frame ROI means (with their capture timestamps) into a result.

    Frames without a face detection are missing from `rgb_signals`. Treating
    the remainder as uniformly sampled compresses the time axis and inflates
    BPM by 1/(1 - drop_ratio), so the signal is first resampled onto a
    uniform grid using the real timestamps, and clips with too many dropped
    frames are rejected outright.
    """
    if len(rgb_signals) < 100:
        raise RppgError("FACE_NOT_DETECTED", "Couldn't reliably track a face in the video.")

    drop_ratio = 1.0 - len(rgb_signals) / total_frames if total_frames > 0 else 0.0
    if drop_ratio > MAX_DROP_RATIO:
        raise RppgError(
            "LOW_QUALITY_VIDEO",
            "Face tracking dropped out too often. Try again in brighter, more even light.",
        )

    span = float(timestamps[-1] - timestamps[0])
    if not np.isfinite(span) or span > MAX_CLIP_SECONDS:
        raise RppgError(
            "LOW_QUALITY_VIDEO",
            "The recording's timing looks wrong. Please record a normal 20-second measurement.",
        )

    uniform = _resample_uniform(rgb_signals, timestamps, ANALYSIS_FS)
    if len(uniform) < MIN_ANALYSIS_SECONDS * ANALYSIS_FS:
        raise RppgError(
            "LOW_QUALITY_VIDEO",
            "The recording was too short to read a heart rate. Please measure again.",
        )

    rppg_signal = _pos_algorithm(uniform, ANALYSIS_FS)
    rppg_filtered = _bandpass(rppg_signal, low=0.7, high=4.0, fs=ANALYSIS_FS)

    bpm, snr_db = _estimate_bpm(rppg_filtered, ANALYSIS_FS)
    if snr_db < MIN_SNR_DB:
        raise RppgError(
            "LOW_QUALITY_VIDEO",
            "Couldn't find a clear pulse in this recording. Hold still in bright, even light and measure again.",
        )
    hrv_ms = _estimate_hrv_ms(rppg_filtered, ANALYSIS_FS, bpm)
    # 0.5 at the rejection threshold, rising to 1.0 at 10 dB above it.
    confidence = float(np.clip(0.5 + (snr_db - MIN_SNR_DB) / 20.0, 0.0, 1.0))

    return {
        "status": "success",
        "bpm": int(round(bpm)),
        "hrv_ms": int(hrv_ms),
        "confidence": round(confidence, 2),
        "duration_seconds": round(total_frames / fps, 2),
        "frames_analyzed": len(rgb_signals),
    }


def _resample_uniform(rgb: np.ndarray, timestamps: np.ndarray, fps: float) -> np.ndarray:
    """Linearly interpolate the RGB series onto a uniform 1/fps grid."""
    grid = np.arange(timestamps[0], timestamps[-1], 1.0 / fps)
    return np.stack(
        [np.interp(grid, timestamps, rgb[:, ch]) for ch in range(rgb.shape[1])],
        axis=1,
    )


# ---- private helpers --------------------------------------------------


def _extract_face_rgb(path: str) -> Tuple[np.ndarray, np.ndarray, float, int]:
    """Returns (rgb_means, timestamps_seconds, fps, total_frames_read).

    Frames without a face detection contribute no sample, but their absence
    is preserved in the timestamps so downstream resampling can restore a
    uniform time base.
    """
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RppgError("LOW_QUALITY_VIDEO", "Could not open video.")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    rgb_signals: list[np.ndarray] = []
    face_frames: list[int] = []
    pos_msec: list[float] = []
    frame_idx = 0
    try:
        with mp.solutions.face_mesh.FaceMesh(
            static_image_mode=False, max_num_faces=1, refine_landmarks=False
        ) as face_mesh:
            for frame, frame_msec in _read_frames(cap):
                pos_msec.append(frame_msec)
                frame_idx += 1
                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                result = face_mesh.process(rgb)
                if not result.multi_face_landmarks:
                    continue
                mask = _build_roi_mask(rgb, result.multi_face_landmarks[0])
                pixels = rgb[mask]
                if len(pixels) > 0:
                    rgb_signals.append(pixels.mean(axis=0))
                    face_frames.append(frame_idx - 1)
    finally:
        cap.release()

    frame_times = _frame_times(pos_msec, fps)
    return (
        np.asarray(rgb_signals, dtype=np.float64),
        frame_times[np.asarray(face_frames, dtype=int)],
        fps,
        frame_idx,
    )


def _read_frames(cap) -> Iterator[Tuple[np.ndarray, float]]:
    """Yield (frame, pos_msec) for each decoded frame of `cap`.

    Refuses clips with more, or larger, frames than a measurement needs —
    from the container's declared values before decoding anything, and from
    the decoded frames in case the header understates them.
    """
    too_much = RppgError(
        "LOW_QUALITY_VIDEO",
        "This video is too long or too large to analyse. Please record a normal 20-second measurement.",
    )
    declared_pixels = cap.get(cv2.CAP_PROP_FRAME_WIDTH) * cap.get(cv2.CAP_PROP_FRAME_HEIGHT)
    if cap.get(cv2.CAP_PROP_FRAME_COUNT) > MAX_FRAMES or declared_pixels > MAX_FRAME_PIXELS:
        raise too_much

    count = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            return
        count += 1
        if count > MAX_FRAMES or frame.shape[0] * frame.shape[1] > MAX_FRAME_PIXELS:
            raise too_much
        yield frame, cap.get(cv2.CAP_PROP_POS_MSEC)


def _frame_times(pos_msec: list[float], fps: float) -> np.ndarray:
    """Per-frame capture times in seconds, starting at 0.

    Phone and browser recordings are variable-frame-rate, so the container's
    presentation timestamps are the truth and idx/fps is only an average.
    Falls back to idx/fps when the backend reports no usable timestamps
    (all zero, repeated/decreasing, or non-finite).
    """
    ms = np.asarray(pos_msec, dtype=np.float64)
    if len(ms) > 1 and np.all(np.isfinite(ms)) and np.all(np.diff(ms) > 0):
        return (ms - ms[0]) / 1000.0
    return np.arange(len(ms), dtype=np.float64) / fps


def _build_roi_mask(frame: np.ndarray, landmarks) -> np.ndarray:
    h, w = frame.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)
    for group in (FOREHEAD_LANDMARKS, LEFT_CHEEK_LANDMARKS, RIGHT_CHEEK_LANDMARKS):
        pts = np.array(
            [
                (int(landmarks.landmark[i].x * w), int(landmarks.landmark[i].y * h))
                for i in group
            ],
            dtype=np.int32,
        )
        cv2.fillPoly(mask, [pts], 1)
    return mask.astype(bool)


def _pos_algorithm(rgb: np.ndarray, fps: float) -> np.ndarray:
    """Plane Orthogonal to Skin (POS) — Wang et al. 2017."""
    window = max(int(1.6 * fps), 30)
    n = len(rgb)
    h = np.zeros(n, dtype=np.float64)
    if n <= window:
        return h

    for i in range(window, n):
        block = rgb[i - window : i]
        mean = block.mean(axis=0)
        # Guard against zero-mean channels.
        mean = np.where(mean == 0, 1e-9, mean)
        cn = block / mean
        S = np.array([[0, 1, -1], [-2, 1, 1]]) @ cn.T
        std1 = S[1].std()
        if std1 == 0:
            continue
        component = S[0] + (S[0].std() / std1) * S[1]
        h[i - window : i] += component - component.mean()
    return h


def _bandpass(signal: np.ndarray, low: float, high: float, fs: float, order: int = 4) -> np.ndarray:
    nyq = 0.5 * fs
    low_n = low / nyq
    high_n = min(high / nyq, 0.99)
    b, a = butter(order, [low_n, high_n], btype="band")
    return filtfilt(b, a, signal)


def _power_spectrum(signal: np.ndarray, fs: float) -> Tuple[np.ndarray, np.ndarray]:
    """Hann-windowed power spectrum, zero-padded to 8x the signal length.

    The padding interpolates the spectrum so the peak is no longer stuck on
    the 1/duration grid (3 BPM apart for a 20 s clip); the window keeps
    leakage from neighbouring peaks out of the estimate.
    """
    n = len(signal)
    n_fft = 1 << int(np.ceil(np.log2(8 * n)))
    windowed = (signal - signal.mean()) * np.hanning(n)
    power = np.abs(np.fft.rfft(windowed, n_fft)) ** 2
    return np.fft.rfftfreq(n_fft, 1.0 / fs), power


def _estimate_bpm(signal: np.ndarray, fs: float) -> Tuple[float, float]:
    """Returns (bpm, snr_db) from the strongest pulse peak.

    A real PPG wave carries a second harmonic, sometimes stronger than the
    fundamental, which would read as twice the heart rate. A true heart rate
    puts power at its own harmonic but none at half its frequency, so a
    substantial peak at half the strongest frequency marks the strongest
    peak as the harmonic.
    """
    freqs, power = _power_spectrum(signal, fs)
    search = (freqs >= HR_SEARCH_HZ[0]) & (freqs <= HR_SEARCH_HZ[1])
    if not search.any():
        return 0.0, float("-inf")
    peak = int(np.flatnonzero(search)[np.argmax(power[search])])
    hr_hz = float(freqs[peak])

    near_half = np.abs(freqs - hr_hz / 2.0) <= 0.05
    if hr_hz / 2.0 >= HR_SEARCH_HZ[0] and near_half.any():
        sub = int(np.flatnonzero(near_half)[np.argmax(power[near_half])])
        if power[sub] >= SUBHARMONIC_POWER_RATIO * power[peak]:
            hr_hz = float(freqs[sub])

    return hr_hz * 60.0, _snr_db(freqs, power, hr_hz)


def _snr_db(freqs: np.ndarray, power: np.ndarray, hr_hz: float) -> float:
    """Spectral SNR adapted from de Haan & Jeanne (2013), as a power density
    ratio: mean power within ±0.1 Hz of the heart rate against mean power in
    the rest of the analysis band.

    The harmonic window (±0.2 Hz around 2x the rate) is left out of the noise
    but, unlike the original, not credited as signal: it only lies inside the
    band for rates below ~114 BPM, so crediting it handed slow rates free
    noise power and refused fast ones (the alert range) more often, and let a
    noise peak near half a very fast rate claim the real peak as "its
    harmonic". Comparing means rather than sums keeps the ratio independent
    of how much of the band that exclusion removes.
    """
    band = (freqs >= SNR_BAND_HZ[0]) & (freqs <= SNR_BAND_HZ[1])
    fundamental = band & (np.abs(freqs - hr_hz) <= 0.1)
    noise = band & ~fundamental & ~(np.abs(freqs - 2 * hr_hz) <= 0.2)
    if not fundamental.any() or not noise.any():
        return float("-inf")
    pulse_density = float(power[fundamental].mean())
    noise_density = float(power[noise].mean())
    if pulse_density <= 0.0:
        return float("-inf")
    if noise_density <= 0.0:
        return float("inf")
    return 10.0 * float(np.log10(pulse_density / noise_density))


def _estimate_hrv_ms(signal: np.ndarray, fs: float, bpm: float) -> float:
    """Estimate HRV (RMSSD-like) from peak-to-peak intervals.

    Phone-camera rPPG HRV is notoriously noisy. We mitigate that with:
      1. A tight plausibility window (±20% of expected RR) to drop outliers.
      2. A prominence threshold on peak detection so noise spikes are ignored.
      3. A conservative ceiling (80 ms) — anything higher is almost
         certainly noise, not real heart-rate variability.
    Returns 0 when fewer than 4 plausible beats are found.
    """
    if bpm <= 0:
        return 0.0

    expected_ms = 60_000.0 / bpm
    # Narrower window: keep only intervals close to the dominant rhythm.
    lo, hi = expected_ms * 0.8, expected_ms * 1.2

    # Require peaks to stand out from the local noise floor.
    # Half the signal's robust amplitude is a reasonable bar.
    prominence_threshold = float(np.percentile(np.abs(signal), 75) * 0.5)

    # Beats can't be closer than 80% of the expected interval.
    min_distance = max(int(fs * expected_ms / 1000.0 * 0.8), 1)

    peaks, _ = find_peaks(
        signal,
        distance=min_distance,
        prominence=prominence_threshold,
    )
    if len(peaks) < 5:
        return 0.0

    intervals_ms = np.diff(peaks) / fs * 1000.0
    plausible = intervals_ms[(intervals_ms >= lo) & (intervals_ms <= hi)]
    if len(plausible) < 4:
        return 0.0

    # RMSSD — root-mean-square of successive differences.
    diffs = np.diff(plausible)
    rmssd = float(np.sqrt(np.mean(diffs ** 2)))

    # Tighten the ceiling. A true rPPG HRV above 80 ms is rare at rest.
    return float(np.clip(rmssd, 0.0, 80.0))
