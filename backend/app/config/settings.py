"""Application settings — loaded from environment / .env file."""

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

# Determine execution environment (Development vs PyInstaller Frozen .exe)
import sys

_IS_FROZEN = getattr(sys, "frozen", False)

if _IS_FROZEN:
    # 1. Project Root: The directory containing the .exe (for writable data, duckdb, logs)
    _PROJECT_ROOT = Path(sys.executable).resolve().parent
    # 2. Bundle Root: PyInstaller temporary extraction directory (for embedded code and static assets)
    _BUNDLE_ROOT = Path(getattr(sys, "_MEIPASS", _PROJECT_ROOT)).resolve()
else:
    _PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
    _BUNDLE_ROOT = _PROJECT_ROOT


class Settings(BaseSettings):
    """Central configuration for ANVITRACE."""

    model_config = SettingsConfigDict(
        env_file=str(_PROJECT_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Application ---
    APP_NAME: str = "ANVITRACE"
    APP_ENV: str = "production" if _IS_FROZEN else "development"
    DEBUG: bool = not _IS_FROZEN
    LOG_LEVEL: str = "INFO"

    # --- Server ---
    HOST: str = "127.0.0.1"
    PORT: int = 8000

    # --- Database ---
    DUCKDB_PATH: str = "data/anvitrace.duckdb"

    # --- Security & Audit ---
    AUDIT_KEY: str | None = None
    TRUSTED_MANIFEST_PATH: str = "data/trusted_manifest.json"

    # --- Data Directories ---
    DATA_RAW_DIR: str = "data/raw"
    DATA_PROCESSED_DIR: str = "data/processed"
    DATA_INDEXES_DIR: str = "data/indexes"
    DATA_EVIDENCE_DIR: str = "data/evidence"
    DATA_EXPORTS_DIR: str = "data/exports"

    @property
    def project_root(self) -> Path:
        return _PROJECT_ROOT

    @property
    def bundle_root(self) -> Path:
        return _BUNDLE_ROOT

    @property
    def duckdb_abs_path(self) -> Path:
        return _PROJECT_ROOT / self.DUCKDB_PATH

    @property
    def frontend_dist_path(self) -> Path:
        # Check inside PyInstaller bundle first
        bundled = _BUNDLE_ROOT / "frontend" / "dist"
        if bundled.exists() and (bundled / "index.html").exists():
            return bundled
        # Check workspace relative path
        workspace_dist = _PROJECT_ROOT.parent / "frontend" / "dist"
        if workspace_dist.exists() and (workspace_dist / "index.html").exists():
            return workspace_dist
        # Check local relative path
        local_dist = _PROJECT_ROOT / "frontend" / "dist"
        return local_dist


settings = Settings()
