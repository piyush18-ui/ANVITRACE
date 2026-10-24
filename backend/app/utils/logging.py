"""Structured logging utility for ANVITRACE."""

import logging
import sys
from typing import Any

from app.config.settings import settings


def setup_logging() -> logging.Logger:
    """Configure and return the root application logger."""
    logger = logging.getLogger("anvitrace")
    if logger.handlers:
        return logger

    level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
    logger.setLevel(level)

    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(
        fmt="%(asctime)s [%(levelname)s] [%(name)s] %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


logger = setup_logging()


def log_event(event_name: str, **kwargs: Any) -> None:
    """Log a structured key-value event."""
    parts = [f"{k}={v}" for k, v in kwargs.items()]
    logger.info(f"EVENT={event_name} " + " ".join(parts))
