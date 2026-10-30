"""Bounds on how much video one measurement may make the server decode.

Frame count and frame size are set by whoever uploads the clip: a 50 MB cap
does not stop a near-blank video from packing tens of thousands of frames,
or 8K frames, each of which is decoded and run through face tracking while
every other user waits on the single-job gate.

The capture below stands in for OpenCV's decoder (cv2 is stubbed in tests);
its read count is the work the server did.
"""

import numpy as np
import pytest

import rppg


class _FakeCapture:
    def __init__(self, shape=(480, 640, 3), frames=None, declared=None):
        self.frame = np.zeros(shape, dtype=np.uint8)
        self.frames = frames  # None: the stream never ends
        self.declared = declared or {}
        self.reads = 0

    def read(self):
        if self.frames is not None and self.reads >= self.frames:
            return False, None
        self.reads += 1
        return True, self.frame

    def get(self, prop):
        if prop is rppg.cv2.CAP_PROP_POS_MSEC:
            return self.reads * 1000.0 / 30.0
        return self.declared.get(prop, 0.0)


def test_normal_measurement_clip_is_read_in_full():
    cap = _FakeCapture(shape=(720, 1280, 3), frames=600)
    frames = list(rppg._read_frames(cap))
    assert len(frames) == 600
    assert [ms for _, ms in frames[:3]] == pytest.approx([1000 / 30, 2000 / 30, 3000 / 30])


def test_endless_stream_is_refused_after_a_bounded_number_of_frames():
    cap = _FakeCapture(frames=None)
    with pytest.raises(rppg.RppgError) as exc:
        for _ in rppg._read_frames(cap):
            pass
    assert exc.value.code == "LOW_QUALITY_VIDEO"
    assert cap.reads <= rppg.MAX_FRAMES + 1


def test_oversized_frames_are_refused_before_any_is_processed():
    cap = _FakeCapture(shape=(2160, 3840, 3), frames=600)
    with pytest.raises(rppg.RppgError) as exc:
        next(rppg._read_frames(cap))
    assert exc.value.code == "LOW_QUALITY_VIDEO"


@pytest.mark.parametrize(
    "declared",
    [
        {rppg.cv2.CAP_PROP_FRAME_COUNT: 50_000.0},
        {rppg.cv2.CAP_PROP_FRAME_WIDTH: 7680.0, rppg.cv2.CAP_PROP_FRAME_HEIGHT: 4320.0},
    ],
)
def test_clip_declaring_too_much_video_is_refused_without_decoding(declared):
    cap = _FakeCapture(frames=600, declared=declared)
    with pytest.raises(rppg.RppgError) as exc:
        next(rppg._read_frames(cap))
    assert exc.value.code == "LOW_QUALITY_VIDEO"
    assert cap.reads == 0
