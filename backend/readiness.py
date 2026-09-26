"""Cheap readiness checks with no inference or optional-service network I/O."""

from __future__ import annotations

import logging
from typing import Any, Callable

from sqlalchemy import text


logger = logging.getLogger(__name__)


def ai_component_status(pipeline: Any) -> dict[str, str]:
    required_attributes = ("detector", "classifier", "dino_transform")
    ready = pipeline is not None and all(
        getattr(pipeline, attribute, None) is not None
        for attribute in required_attributes
    )
    if not ready:
        logger.error("readiness_ai_check_failed")
    return {"status": "ready" if ready else "not_ready"}


def database_component_status(session_factory: Callable) -> dict[str, str]:
    session = None
    try:
        session = session_factory()
        session.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        logger.exception("readiness_database_check_failed")
        return {"status": "not_ready"}
    finally:
        if session is not None:
            try:
                session.close()
            except Exception:
                logger.exception("readiness_database_session_close_failed")


def build_readiness(
    *,
    pipeline: Any,
    session_factory: Callable,
    storage_configured: bool,
    geocoding_enabled: bool,
) -> tuple[dict[str, Any], int]:
    """Return a component-safe payload and its HTTP status code."""
    components = {
        "ai": ai_component_status(pipeline),
        "database": database_component_status(session_factory),
        "storage": {
            "status": "configured" if storage_configured else "unconfigured"
        },
        "geocoding": {
            "status": "enabled" if geocoding_enabled else "disabled"
        },
    }
    required_ready = all(
        components[name]["status"] == "ready"
        for name in ("ai", "database")
    )
    payload = {
        "status": "ready" if required_ready else "not_ready",
        "components": components,
    }
    return payload, 200 if required_ready else 503
