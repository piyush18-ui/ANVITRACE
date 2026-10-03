"""ANVITRACE — Forensic Desktop Application Launcher (Root Entry).

Delegates to backend/launcher.py.
"""

from __future__ import annotations

import sys
from pathlib import Path

# Add backend directory to sys.path
_REPO_ROOT = Path(__file__).resolve().parent
_BACKEND_DIR = _REPO_ROOT / "backend"
if _BACKEND_DIR.exists() and str(_BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(_BACKEND_DIR))

from launcher import main

if __name__ == "__main__":
    main()
