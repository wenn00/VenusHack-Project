"""rPPG core algorithm.

Pipeline:
    1. Read the video frames.
    2. Detect the face on each frame using MediaPipe FaceMesh.
    3. Build an ROI mask covering forehead + cheeks and extract its RGB mean.
    4. Apply the POS algorithm (Wang et al., 2017) to derive a 1-D rPPG signal.
    5. Bandpass filter to 0.7-4 Hz (i.e. 42-240 BPM).
    6. Estimate heart rate via FFT peak, HRV via peak-interval std.

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

from typing import Tuple

import cv2
import mediapipe as mp
import numpy as np
from scipy.fft import fft, fftfreq
from scipy.signal import butter, filtfilt, find_peaks


class RppgError(Exception):
    """Domain error carrying a stable machine-readable code."""

    def __init__(self, code: str, message: str) -> None:
        super().__init__(message)
        self.code = code


# Indices into MediaPipe FaceMesh's 468 landmarks that outline the forehead +
# both cheeks. Tuned for good signal-to-noise on typical front-camera framing.
FOREHEAD_LANDMARKS = [10, 67, 109, 338, 297]
LEFT_CHEEK_LANDMARKS = [50, 101, 119, 117]
RIGHT_CHEEK_LANDMARKS = [280, 330, 348, 346]

_face_mesh = mp.solutions.face_mesh.FaceMesh(
    static_image_mode=False, max_num_faces=1, refine_landmarks=False
)


def process_video(path: str) -> dict[str, object]:
    rgb_signals, fps = _extract_face_rgb(path)
    if len(rgb_signals) < 100:
        raise RppgError("FACE_NOT_DETECTED", "Couldn't reliably track a face in the video.")

    rppg_signal = _pos_algorithm(rgb_signals, fps)
    rppg_filtered = _bandpass(rppg_signal, low=0.7, high=4.0, fs=fps)

    bpm, snr = _estimate_bpm(rppg_filtered, fps)
    hrv_ms = _estimate_hrv_ms(rppg_filtered, fps, bpm)
    confidence = float(min(snr / 10.0, 1.0))

    return {
        "status": "success",
        "bpm": int(round(bpm)),
        "hrv_ms": int(hrv_ms),
        "confidence": round(confidence, 2),
        "duration_seconds": round(len(rgb_signals) / fps, 2),
        "frames_analyzed": len(rgb_signals),
    }


# ---- private helpers --------------------------------------------------


def _extract_face_rgb(path: str) -> Tuple[np.ndarray, float]:
    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise RppgError("LOW_QUALITY_VIDEO", "Could not open video.")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30.0

    rgb_signals: list[np.ndarray] = []
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        result = _face_mesh.process(rgb)
        if not result.multi_face_landmarks:
            continue
        mask = _build_roi_mask(rgb, result.multi_face_landmarks[0])
        pixels = rgb[mask]
        if len(pixels) > 0:
            rgb_signals.append(pixels.mean(axis=0))
    cap.release()

    return np.asarray(rgb_signals, dtype=np.float64), fps


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


def _estimate_bpm(signal: np.ndarray, fs: float) -> Tuple[float, float]:
    n = len(signal)
    yf = np.abs(fft(signal))[: n // 2]
    xf = fftfreq(n, 1 / fs)[: n // 2]
    mask = (xf >= 0.7) & (xf <= 4.0)
    if mask.sum() == 0:
        return 72.0, 0.0
    band = yf[mask]
    peak_idx = int(np.argmax(band))
    peak_freq = float(xf[mask][peak_idx])
    bpm = peak_freq * 60.0
    noise = float(np.median(band))
    snr = float(band[peak_idx]) / (noise + 1e-9)
    return bpm, snr


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
