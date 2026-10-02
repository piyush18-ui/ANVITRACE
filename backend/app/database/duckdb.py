"""DuckDB connection management.

Provides a thread-safe singleton connection manager for DuckDB with
lifecycle integration into FastAPI.
"""

from pathlib import Path

import duckdb

from app.config.settings import settings
from app.database.schema import apply_schema

_connection: duckdb.DuckDBPyConnection | None = None


def get_connection() -> duckdb.DuckDBPyConnection:
    """Return an active DuckDB connection cursor.

    If not yet connected, opens connection to settings.duckdb_abs_path.
    Returns a thread-safe cursor to prevent concurrency locks across worker threads.
    """
    global _connection
    if _connection is None:
        return connect()
    return _connection.cursor()


def connect(db_path: Path | str | None = None) -> duckdb.DuckDBPyConnection:
    """Open (or create) a DuckDB database and store the connection.

    Applies canonical schema on initialization.
    """
    global _connection
    path = Path(db_path) if db_path else settings.duckdb_abs_path
    path.parent.mkdir(parents=True, exist_ok=True)
    _connection = duckdb.connect(str(path))
    apply_schema(_connection)
    return _connection.cursor()


def close() -> None:
    """Close the active DuckDB connection if one exists."""
    global _connection
    if _connection is not None:
        try:
            _connection.close()
        finally:
            _connection = None
