"""Test bootstrap for the rPPG backend.

cv2 and mediapipe are heavy native dependencies that are not needed for the
signal-processing and API-contract tests. Stub them before any test module
imports rppg/main so the real Python code under test loads unchanged.
"""

import sys
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

for _mod in ("cv2", "mediapipe"):
    if _mod not in sys.modules:
        sys.modules[_mod] = MagicMock()
