"""Geometry checks for the face ROI polygons.

Regression target: the forehead polygon used five points that all sit on the
face-oval silhouette (the hairline), enclosing ~0.35 cm² on MediaPipe's
canonical face — a sliver that mostly sampled hair, not skin.

Coordinates come from MediaPipe's canonical face model (see the fixture's
`source`), so areas are in cm² on an average adult face.
"""

import json
from pathlib import Path

import pytest

import rppg

_FIXTURE = json.loads((Path(__file__).parent / "fixtures" / "canonical_face_xy.json").read_text())
XY = _FIXTURE["xy"]

MIN_ROI_AREA_CM2 = 5.0

ROIS = {
    "forehead": rppg.FOREHEAD_LANDMARKS,
    "left_cheek": rppg.LEFT_CHEEK_LANDMARKS,
    "right_cheek": rppg.RIGHT_CHEEK_LANDMARKS,
}


def _area(indices: list[int]) -> float:
    pts = [XY[i] for i in indices]
    twice = sum(
        pts[k][0] * pts[(k + 1) % len(pts)][1] - pts[(k + 1) % len(pts)][0] * pts[k][1]
        for k in range(len(pts))
    )
    return abs(twice) / 2


def _segments_cross(a, b, c, d) -> bool:
    def orient(p, q, r):
        return (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])

    return orient(a, b, c) * orient(a, b, d) < 0 and orient(c, d, a) * orient(c, d, b) < 0


def _is_simple(indices: list[int]) -> bool:
    pts = [XY[i] for i in indices]
    n = len(pts)
    for i in range(n):
        for j in range(i + 1, n):
            if abs(i - j) in (1, n - 1):
                continue  # adjacent edges share a vertex
            if _segments_cross(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]):
                return False
    return True


def test_area_helper_matches_a_hand_checked_triangle():
    # Landmarks 151 (0, 6.55), 9 (0, 4.89) and 337 (1.62, 6.6) form a thin
    # triangle: base 1.66 cm along x=0, apex 1.62 cm away → ~1.34 cm².
    assert _area([151, 9, 337]) == pytest.approx(0.5 * 1.66 * 1.62, abs=0.05)


@pytest.mark.parametrize("name", sorted(ROIS))
def test_roi_polygon_covers_real_skin_area(name):
    assert _area(ROIS[name]) >= MIN_ROI_AREA_CM2


@pytest.mark.parametrize("name", sorted(ROIS))
def test_roi_polygon_does_not_cross_itself(name):
    # cv2.fillPoly on a self-intersecting outline fills an unintended shape.
    assert _is_simple(ROIS[name])
