# ANVITRACE

ANVITRACE is an offline forensic workstation for investigating financial
transactions. It provides transaction ingestion, mule-account detection,
fund-flow tracing, case management, and forensic report generation.

The application combines a React/Vite frontend with a FastAPI backend and a
DuckDB-based analysis engine. The Windows desktop build packages these
components into a standalone executable.

## Run the Windows executable

If you have the `ANVITRACE-v1.0-Offline` distribution folder, double-click
`ANVITRACE.exe`. The application starts its local backend and opens the
workstation in Microsoft Edge app mode or your default browser at
`http://127.0.0.1:8000`.

The executable and runtime data are not stored in this source repository.
GitHub limits individual Git files to 100 MB, and the generated executable is
larger than that. Build the distribution from source as described below, or
download a separately published release when one is available.

## Build the Windows distribution

Requirements:

- Windows
- Python 3.12 or newer
- Node.js and npm

From the repository root, install and build the frontend:

```powershell
cd frontend
npm install
npm run build
cd ..
```

Create the backend environment at the path expected by the packaging script,
install the backend dependencies and PyInstaller, then build the distribution:

```powershell
python -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
backend\.venv\Scripts\python.exe -m pip install pyinstaller
backend\.venv\Scripts\python.exe build_offline_package.py
```

The script creates `ANVITRACE-v1.0-Offline` in the repository root. Open
`ANVITRACE.exe` in that folder to start the application. Generated executables,
databases, datasets, and local environment files are intentionally excluded
from Git.

## Project layout

```text
backend/                  FastAPI application and analysis engine
frontend/                 React and Vite user interface
anvitrace.spec            PyInstaller executable specification
build_offline_package.py  Windows offline distribution builder
launcher.py               Root launcher entry point
```

## Development

Install frontend dependencies with `npm install` in `frontend/`. Install the
backend dependencies from `backend/requirements.txt` using Python 3.12 or
newer. Keep local credentials and environment files out of version control;
configure local settings in an untracked `.env` file as needed.
