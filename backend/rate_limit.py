"""Small in-memory sliding-window limiter for single-process staging."""

from __future__ import annotations

from collections import deque
import math
import threading
import time


class InMemoryRateLimiter:
    """Thread-safe limiter whose buckets are local to one Python process."""

    def __init__(self, max_buckets: int = 10_000) -> None:
        self._buckets: dict[str, deque[float]] = {}
        self._lock = threading.Lock()
        self._max_buckets = max(100, int(max_buckets))

    def check(
        self,
        key: str,
        *,
        limit: int,
        window_seconds: int,
        now: float | None = None,
    ) -> int | None:
        """Record a request or return the required Retry-After seconds."""
        if limit < 1 or window_seconds < 1:
            raise ValueError("Rate limit dan window harus lebih besar dari nol.")

        current_time = time.monotonic() if now is None else float(now)
        cutoff = current_time - window_seconds

        with self._lock:
            bucket = self._buckets.setdefault(key, deque())
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()

            if len(bucket) >= limit:
                return max(1, math.ceil(bucket[0] + window_seconds - current_time))

            bucket.append(current_time)
            self._evict_if_needed(current_time)
            return None

    def _evict_if_needed(self, current_time: float) -> None:
        if len(self._buckets) <= self._max_buckets:
            return

        stale_before = current_time - 3600
        stale_keys = [
            key
            for key, bucket in self._buckets.items()
            if not bucket or bucket[-1] < stale_before
        ]
        for key in stale_keys:
            self._buckets.pop(key, None)
            if len(self._buckets) <= self._max_buckets:
                return

        while len(self._buckets) > self._max_buckets:
            self._buckets.pop(next(iter(self._buckets)))


rate_limiter = InMemoryRateLimiter()
