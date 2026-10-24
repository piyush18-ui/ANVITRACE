"""ANVITRACE — Forensic Desktop Application Launcher.

Launches the offline Uvicorn server and automatically opens the native
forensic app workstation window via Microsoft Edge (App Mode) or the system browser.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
import threading
import time
import urllib.request
from pathlib import Path

# Fix Windows console encoding for legacy code pages (e.g. cp1252)
if sys.platform == "win32":
    try:
        if hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure backend project directory is in sys.path
_CURRENT_DIR = Path(__file__).resolve().parent
if (_CURRENT_DIR / "app").exists():
    if str(_CURRENT_DIR) not in sys.path:
        sys.path.insert(0, str(_CURRENT_DIR))
elif (_CURRENT_DIR / "backend" / "app").exists():
    backend_path = str(_CURRENT_DIR / "backend")
    if backend_path not in sys.path:
        sys.path.insert(0, backend_path)

import uvicorn

from app.config.settings import settings
from app.main import app
from app.utils.logging import logger

BANNER = r"""
================================================================================
     _    _   ___     _____ _____ ____     _    ____ _____ 
    / \  | \ | \ \   / /_ _|_   _|  _ \   / \  / ___| ____|
   / _ \ |  \| |\ \ / / | |  | | | |_) | / _ \| |   |  _|  
  / ___ \| |\  | \ V /  | |  | | |  _ < / ___ \ |___| |___ 
 /_/   \_\_| \_|  \_/  |___| |_| |_| \_\_/   \_\____|_____|
 
                     OFFLINE FORENSIC WORKSTATION v1.0
          AI-Powered Mule Account Detection & Transaction Tracing
================================================================================
"""


def find_edge_browser() -> str | None:
    """Locate Microsoft Edge executable on Windows."""
    # 1. System PATH
    edge_in_path = shutil.which("msedge") or shutil.which("msedge.exe")
    if edge_in_path and os.path.exists(edge_in_path):
        return edge_in_path

    # 2. Standard Windows locations
    candidate_paths = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        os.path.expandvars(r"%PROGRAMFILES(X86)%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%PROGRAMFILES%\Microsoft\Edge\Application\msedge.exe"),
        os.path.expandvars(r"%LOCALAPPDATA%\Microsoft\Edge\Application\msedge.exe"),
    ]
    for candidate in candidate_paths:
        if candidate and os.path.exists(candidate):
            return candidate

    return None


def wait_for_server(url: str, timeout_seconds: int = 30) -> bool:
    """Poll the /health endpoint until the backend responds 200 OK."""
    health_url = f"{url.rstrip('/')}/health"
    start_time = time.time()
    logger.info(f"Waiting for backend health check at {health_url}...")

    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(health_url, headers={"User-Agent": "ANVITRACE-Launcher"})
            with urllib.request.urlopen(req, timeout=1.0) as response:
                if response.status == 200:
                    return True
        except Exception:
            time.sleep(0.3)

    return False


def launch_forensic_window(url: str) -> subprocess.Popen | None:
    """Launch the Native Forensic App Window via MS Edge App-Mode or default browser."""
    edge_executable = find_edge_browser()

    if edge_executable:
        try:
            logger.info(f"Launching Forensic Workstation App Window via Edge: {edge_executable}")
            # Launch MS Edge in standalone app-mode with forensic window dimension
            proc = subprocess.Popen([
                edge_executable,
                f"--app={url}",
                "--window-size=1440,900",
                "--app-id=anvitrace-forensics",
            ])
            return proc
        except Exception as exc:
            logger.warning(f"Could not launch Edge app-mode ({exc}); falling back to default browser.")

    # Fallback to standard web browser
    import webbrowser

    logger.info("Opening ANVITRACE in system default browser...")
    webbrowser.open(url)
    return None


def main() -> None:
    """Main launcher entrypoint."""
    # Print banner
    print(BANNER)

    host = settings.HOST
    port = settings.PORT
    url = f"http://{host}:{port}"

    print(f"[*] Environment: {settings.APP_ENV.upper()}")
    print(f"[*] DuckDB Database Path: {settings.duckdb_abs_path}")
    print(f"[*] Frontend Static Dist: {settings.frontend_dist_path}")
    print(f"[*] Server Binding: {url}")
    print("--------------------------------------------------------------------------------")

    # Configure Uvicorn server
    config = uvicorn.Config(
        app=app,
        host=host,
        port=port,
        log_level="info",
        access_log=False,
    )
    server = uvicorn.Server(config)

    # Start Uvicorn in background daemon thread
    server_thread = threading.Thread(target=server.run, daemon=True, name="uvicorn-daemon")
    server_thread.start()

    # Wait for server health endpoint
    if not wait_for_server(url, timeout_seconds=30):
        print("[!] ERROR: Server failed to start within 30 seconds.")
        server.should_exit = True
        sys.exit(1)

    print("[+] ANVITRACE backend engine is ready and serving.")
    print(f"[+] UI available at: {url}")

    # Launch native desktop application window
    app_proc = launch_forensic_window(url)
    print("[+] Forensic workstation window launched successfully.")
    print("--------------------------------------------------------------------------------")
    print("Press Ctrl+C in this terminal (or close this window) to exit ANVITRACE.")

    try:
        if app_proc is not None:
            # Allow time for window launch
            time.sleep(2)
            if app_proc.poll() is None:
                # App mode process is running as a child; wait until closed
                app_proc.wait()
                print("[*] Forensic workstation window was closed by user.")
                return

        # Edge detached to existing browser process or opened via webbrowser: keep running
        while not server.should_exit:
            time.sleep(1)

    except KeyboardInterrupt:
        print("\n[*] Shutdown signal received. Exiting ANVITRACE...")
    finally:
        server.should_exit = True
        server_thread.join(timeout=3)
        print("[+] ANVITRACE shutdown complete. Goodbye!")


if __name__ == "__main__":
    main()
