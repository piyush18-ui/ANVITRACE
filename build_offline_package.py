"""ANVITRACE — Offline Executable & Distribution Package Builder.

Automates:
1. Re-verifying the compiled frontend (frontend/dist)
2. Running PyInstaller against anvitrace.spec to produce standalone ANVITRACE.exe
3. Assembling the judge distribution folder:
   ANVITRACE-v1.0-Offline/
   ├── ANVITRACE.exe
   ├── .env
   ├── data/
   │   ├── anvitrace.duckdb
   │   ├── raw/
   │   └── exports/
   ├── sample_datasets/
   └── README_JUDGE.txt
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent
BACKEND_DIR = REPO_ROOT / "backend"
FRONTEND_DIR = REPO_ROOT / "frontend"
FRONTEND_DIST = FRONTEND_DIR / "dist"
DIST_OUTPUT = REPO_ROOT / "dist"
OFFLINE_DIR = REPO_ROOT / "ANVITRACE-v1.0-Offline"

PYTHON_EXE = BACKEND_DIR / ".venv" / "Scripts" / "python.exe"
PYINSTALLER_EXE = BACKEND_DIR / ".venv" / "Scripts" / "pyinstaller.exe"


def check_prerequisites() -> bool:
    """Validate that Python virtualenv and pyinstaller exist."""
    if not PYTHON_EXE.exists():
        print(f"[!] Error: Virtualenv Python not found at {PYTHON_EXE}")
        return False
    if not PYINSTALLER_EXE.exists():
        print(f"[!] Error: PyInstaller not found at {PYINSTALLER_EXE}")
        return False
    if not (FRONTEND_DIST / "index.html").exists():
        print(f"[!] Warning: frontend/dist/index.html not found. Building frontend now...")
        npm_cmd = shutil.which("npm") or shutil.which("npm.cmd") or r"C:\Program Files\nodejs\npm.cmd"
        if not os.path.exists(str(npm_cmd)):
            print("[!] Error: npm not found to build frontend.")
            return False
        subprocess.run([str(npm_cmd), "run", "build"], cwd=str(FRONTEND_DIR), check=True)
    return True


def run_pyinstaller() -> bool:
    """Execute PyInstaller build."""
    spec_file = REPO_ROOT / "anvitrace.spec"
    if not spec_file.exists():
        spec_file = BACKEND_DIR / "anvitrace.spec"

    print("--------------------------------------------------------------------------------")
    print(f"[*] Running PyInstaller with spec: {spec_file}")
    print("--------------------------------------------------------------------------------")

    cmd = [
        str(PYINSTALLER_EXE),
        "--clean",
        "--noconfirm",
        str(spec_file),
    ]

    res = subprocess.run(cmd, cwd=str(REPO_ROOT))
    return res.returncode == 0


def assemble_distribution() -> None:
    """Create the ready-to-run ANVITRACE-v1.0-Offline distribution folder."""
    print("--------------------------------------------------------------------------------")
    print(f"[*] Assembling Judge Distribution Folder: {OFFLINE_DIR}")
    print("--------------------------------------------------------------------------------")

    OFFLINE_DIR.mkdir(parents=True, exist_ok=True)

    # 1. Locate and copy ANVITRACE.exe
    built_exe = DIST_OUTPUT / "ANVITRACE.exe"
    if not built_exe.exists():
        alt_exe = DIST_OUTPUT / "ANVITRACE" / "ANVITRACE.exe"
        if alt_exe.exists():
            built_exe = alt_exe

    if built_exe.exists():
        target_exe = OFFLINE_DIR / "ANVITRACE.exe"
        print(f"[+] Copying binary: {built_exe} -> {target_exe}")
        shutil.copy2(built_exe, target_exe)
        # Also copy _internal folder if built as onedir
        internal_dir = built_exe.parent / "_internal"
        if internal_dir.exists():
            target_internal = OFFLINE_DIR / "_internal"
            print(f"[+] Copying internal dependencies: {internal_dir} -> {target_internal}")
            if target_internal.exists():
                shutil.rmtree(target_internal)
            shutil.copytree(internal_dir, target_internal)
    else:
        print(f"[!] Warning: Built binary not found at {built_exe}")

    # 2. Write offline default .env
    env_content = """# ANVITRACE Offline Workstation Configuration
APP_NAME=ANVITRACE
APP_ENV=production
DEBUG=false
LOG_LEVEL=INFO

HOST=127.0.0.1
PORT=8000

DUCKDB_PATH=data/anvitrace.duckdb

DATA_RAW_DIR=data/raw
DATA_PROCESSED_DIR=data/processed
DATA_INDEXES_DIR=data/indexes
DATA_EVIDENCE_DIR=data/evidence
DATA_EXPORTS_DIR=data/exports
"""
    (OFFLINE_DIR / ".env").write_text(env_content, encoding="utf-8")
    print("[+] Created default offline .env")

    # 3. Create data directory structure and copy existing duckdb
    data_dir = OFFLINE_DIR / "data"
    for sub in ["raw", "processed", "indexes", "evidence", "exports"]:
        (data_dir / sub).mkdir(parents=True, exist_ok=True)

    source_duckdb = BACKEND_DIR / "data" / "anvitrace.duckdb"
    dest_duckdb = data_dir / "anvitrace.duckdb"
    if source_duckdb.exists() and not dest_duckdb.exists():
        print(f"[+] Copying pre-loaded DuckDB database ({source_duckdb.stat().st_size // (1024*1024)} MB)...")
        shutil.copy2(source_duckdb, dest_duckdb)
    elif dest_duckdb.exists():
        print("[+] Existing DuckDB database is already present.")

    # 4. Copy sample datasets
    sample_dir = OFFLINE_DIR / "sample_datasets"
    sample_dir.mkdir(parents=True, exist_ok=True)

    candidate_samples = [
        BACKEND_DIR / "data" / "raw" / "test_transactions.csv",
        BACKEND_DIR / "data" / "raw" / "p2_scenario.csv",
    ]
    for sample in candidate_samples:
        if sample.exists():
            dest = sample_dir / sample.name
            print(f"[+] Copying sample dataset: {sample.name}")
            shutil.copy2(sample, dest)

    # 5. Create README for judges
    readme_content = """================================================================================
                    ANVITRACE — OFFLINE FORENSIC WORKSTATION
================================================================================

HOW TO RUN:
1. Double-click "ANVITRACE.exe".
2. The local forensic engine will initialize embedded DuckDB and launch the
   Forensic Workstation interface automatically in Microsoft Edge (App Mode)
   or your default browser at http://127.0.0.1:8000.
3. Zero internet connection or external prerequisites required.

FEATURES READY TO TEST:
- Case Diary Generation & Section 65B Bharatiya Sakshya Adhiniyam (BSA) Certification
- Mule Account Ring Detection & Smurfing Analysis
- Fund Flow Tracing & Asset Recovery Freeze Requisitions
- Offline CSV Ingestion (sample test datasets provided in 'sample_datasets/')

TO SHUT DOWN:
- Close the forensic workstation window or press Ctrl+C in the terminal.
================================================================================
"""
    (OFFLINE_DIR / "README_JUDGE.txt").write_text(readme_content, encoding="utf-8")
    print("[+] Created README_JUDGE.txt")

    print("\n================================================================================")
    print(f"ANVITRACE Offline Distribution Ready at: {OFFLINE_DIR}")
    print("================================================================================")


def main() -> None:
    if not check_prerequisites():
        sys.exit(1)

    success = run_pyinstaller()
    if not success:
        print("[!] PyInstaller build failed.")
        sys.exit(1)

    assemble_distribution()


if __name__ == "__main__":
    main()
