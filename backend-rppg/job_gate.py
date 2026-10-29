"""Admission control for /measure.

On the 0.1-CPU Render dyno, concurrency adds no throughput: two
measurements at once each take twice as long and both blow the client's
timeout. The gate runs a fixed number of jobs, lets a few callers queue,
and rejects everyone else immediately so they can retry later.

Single event loop only (uvicorn worker); no locking needed.
"""

from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import AsyncIterator


class GateFull(Exception):
    """Raised when every running and waiting place is taken."""


class JobGate:
    def __init__(self, max_running: int, max_waiting: int) -> None:
        self._running = asyncio.Semaphore(max_running)
        self._capacity = max_running + max_waiting
        self._admitted = 0

    @asynccontextmanager
    async def slot(self) -> AsyncIterator[None]:
        if self._admitted >= self._capacity:
            raise GateFull()
        self._admitted += 1
        try:
            async with self._running:
                yield
        finally:
            self._admitted -= 1
