"""Shared logging utilities for background tasks."""

from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger("novu_framework")


def log_task_exception(task: asyncio.Task[Any]) -> None:
    """Callback for fire-and-forget tasks that logs exceptions instead of swallowing them."""
    if task.cancelled():
        return

    exc = task.exception()
    if exc is not None:
        logger.error("Background agent task failed: %s", exc, exc_info=exc)
