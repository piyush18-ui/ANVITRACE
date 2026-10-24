# -*- mode: python ; coding: utf-8 -*-
"""PyInstaller specification file for ANVITRACE Offline Forensic Workstation."""

import os
import sys
from pathlib import Path

from PyInstaller.utils.hooks import collect_all, collect_submodules

# Resolve directory paths
SPECPATH_DIR = Path(SPECPATH).resolve()
if SPECPATH_DIR.name == "backend":
    BACKEND_DIR = SPECPATH_DIR
    REPO_ROOT = SPECPATH_DIR.parent
else:
    REPO_ROOT = SPECPATH_DIR
    BACKEND_DIR = REPO_ROOT / "backend"

FRONTEND_DIST = REPO_ROOT / "frontend" / "dist"
ASSETS_DIR = BACKEND_DIR / "app" / "assets"
ICON_PATH = ASSETS_DIR / "anvitrace.ico"

# Ensure backend directory is in sys.path for submodule collection
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Collect dependencies with C-extensions and bundled package data
duckdb_datas, duckdb_binaries, duckdb_hidden = collect_all("duckdb")
polars_datas, polars_binaries, polars_hidden = collect_all("polars")
pyarrow_datas, pyarrow_binaries, pyarrow_hidden = collect_all("pyarrow")
reportlab_datas, reportlab_binaries, reportlab_hidden = collect_all("reportlab")
fastapi_datas, fastapi_binaries, fastapi_hidden = collect_all("fastapi")
uvicorn_datas, uvicorn_binaries, uvicorn_hidden = collect_all("uvicorn")
pydantic_datas, pydantic_binaries, pydantic_hidden = collect_all("pydantic")
pydantic_settings_datas, pydantic_settings_binaries, pydantic_settings_hidden = collect_all("pydantic_settings")
starlette_datas, starlette_binaries, starlette_hidden = collect_all("starlette")

# Collect all internal application submodules
app_hidden = collect_submodules("app")

# Additional hidden imports for uvicorn runtime & ASGI protocols
manual_hiddenimports = [
    "uvicorn.logging",
    "uvicorn.loops",
    "uvicorn.loops.auto",
    "uvicorn.protocols",
    "uvicorn.protocols.http",
    "uvicorn.protocols.http.auto",
    "uvicorn.protocols.http.h11_impl",
    "uvicorn.protocols.http.httptools_impl",
    "uvicorn.protocols.websockets",
    "uvicorn.protocols.websockets.auto",
    "uvicorn.lifespan",
    "uvicorn.lifespan.on",
    "uvicorn.lifespan.off",
    "jinja2",
    "jinja2.ext",
    "multipart",
    "python_multipart",
    "starlette.staticfiles",
    "starlette.responses",
    "starlette.routing",
    "starlette.middleware",
    "starlette.middleware.cors",
    "reportlab.pdfgen.canvas",
    "reportlab.platypus",
    "reportlab.lib",
    "reportlab.lib.pagesizes",
    "reportlab.lib.styles",
    "reportlab.lib.units",
    "reportlab.lib.colors",
    "reportlab.pdfbase.pdfmetrics",
    "reportlab.pdfbase.ttfonts",
]

all_datas = [
    (str(FRONTEND_DIST), "frontend/dist"),
    (str(ASSETS_DIR), "app/assets"),
] + duckdb_datas + polars_datas + pyarrow_datas + reportlab_datas + fastapi_datas + uvicorn_datas + pydantic_datas + pydantic_settings_datas + starlette_datas

all_binaries = (
    duckdb_binaries +
    polars_binaries +
    pyarrow_binaries +
    reportlab_binaries +
    fastapi_binaries +
    uvicorn_binaries
)

all_hiddenimports = sorted(list(set(
    duckdb_hidden +
    polars_hidden +
    pyarrow_hidden +
    reportlab_hidden +
    fastapi_hidden +
    uvicorn_hidden +
    pydantic_hidden +
    pydantic_settings_hidden +
    starlette_hidden +
    app_hidden +
    manual_hiddenimports
)))

a = Analysis(
    [str(BACKEND_DIR / "launcher.py")],
    pathex=[str(BACKEND_DIR)],
    binaries=all_binaries,
    datas=all_datas,
    hiddenimports=all_hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=["tkinter", "matplotlib", "scipy", "pytest", "ruff"],
    noarchive=False,
)

pyz = PYZ(a.pure)

# Standalone Single-File Executable
exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name="ANVITRACE",
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=False,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=str(ICON_PATH) if ICON_PATH.exists() else None,
)
