"""Lightweight, secret-safe logging and request correlation helpers."""

from __future__ import annotations

from contextvars import ContextVar
import logging
import re
import time
import uuid

from fastapi import Request
from fastapi.responses import JSONResponse

from config_utils import env_choice


REQUEST_ID_HEADER = "X-Request-ID"
_REQUEST_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")
_request_id: ContextVar[str] = ContextVar("request_id", default="-")


class RequestIdFilter(logging.Filter):
    """Attach the current correlation ID to every application log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _request_id.get()
        return True


def configured_log_level() -> str:
    return env_choice(
        "LOG_LEVEL",
        "INFO",
        {"debug", "info", "warning", "error", "critical"},
    ).upper()


def configure_logging() -> str:
    """Configure one-line logging without printing environment values."""
    level_name = configured_log_level()
    level = getattr(logging, level_name)
    root_logger = logging.getLogger()

    if not root_logger.handlers:
        logging.basicConfig(
            level=level,
            format=(
                "%(asctime)s %(levelname)s %(name)s "
                "request_id=%(request_id)s %(message)s"
            ),
        )
    root_logger.setLevel(level)
    for handler in root_logger.handlers:
        handler.addFilter(RequestIdFilter())
    return level_name


def safe_request_id(candidate: str | None) -> str:
    """Reuse only a bounded, conservative incoming ID; otherwise use UUID4."""
    value = str(candidate or "").strip()
    if value and _REQUEST_ID_PATTERN.fullmatch(value):
        return value
    return str(uuid.uuid4())


async def request_observability_middleware(request: Request, call_next):
    """Correlate, time, and log a request without inspecting its payload."""
    request_id = safe_request_id(request.headers.get(REQUEST_ID_HEADER))
    token = _request_id.set(request_id)
    request.state.request_id = request_id
    started_at = time.perf_counter()
    status_code = 500

    try:
        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            logging.getLogger("sawitvision.request").exception(
                "request_failed method=%s path=%s",
                request.method,
                request.url.path,
            )
            response = JSONResponse(
                status_code=500,
                content={"detail": "Terjadi kesalahan internal."},
            )
            response.headers.setdefault("X-Content-Type-Options", "nosniff")
            response.headers.setdefault("X-Frame-Options", "DENY")
            response.headers.setdefault(
                "Referrer-Policy", "strict-origin-when-cross-origin"
            )

        response.headers[REQUEST_ID_HEADER] = request_id
        return response
    finally:
        duration_ms = (time.perf_counter() - started_at) * 1000
        log_method = (
            logging.getLogger("sawitvision.request").debug
            if request.url.path in {"/health", "/ready"}
            else logging.getLogger("sawitvision.request").info
        )
        log_method(
            "request_completed method=%s path=%s status=%d duration_ms=%.2f",
            request.method,
            request.url.path,
            status_code,
            duration_ms,
        )
        _request_id.reset(token)
