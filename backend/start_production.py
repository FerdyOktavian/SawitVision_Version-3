"""Production pre-start entrypoint for Railway and local smoke tests."""

from __future__ import annotations

import logging
import platform
import sys
import time

from dotenv import load_dotenv

from ai_model_downloader import ModelAcquisitionError, ensure_production_models
from config_utils import ConfigError, env_int, validate_startup_config
from observability import configure_logging


logger = logging.getLogger(__name__)


def _production_port() -> int:
    return env_int("PORT", 8000, minimum=1, maximum=65535)


def main() -> None:
    load_dotenv()
    try:
        validate_startup_config()
    except ConfigError as error:
        raise SystemExit(f"Startup gagal karena konfigurasi: {error}") from None
    configure_logging()
    logger.info(
        "production_startup_started python=%d.%d.%d implementation=%s",
        sys.version_info.major,
        sys.version_info.minor,
        sys.version_info.micro,
        platform.python_implementation(),
    )
    acquisition_started_at = time.perf_counter()
    try:
        ensure_production_models()
    except ModelAcquisitionError as error:
        raise SystemExit(f"Startup gagal saat menyiapkan model: {error}") from None
    logger.info(
        "model_acquisition_completed duration_ms=%.2f",
        (time.perf_counter() - acquisition_started_at) * 1000,
    )

    # Import only after both artifacts are present and verified. The
    # module-level pipeline load performs a second defense-in-depth hash check.
    application_import_started_at = time.perf_counter()
    from main import app as application

    logger.info(
        "fastapi_import_completed duration_ms=%.2f",
        (time.perf_counter() - application_import_started_at) * 1000,
    )
    import uvicorn

    uvicorn.run(
        application,
        host="0.0.0.0",
        port=_production_port(),
        workers=1,
        reload=False,
        log_config=None,
    )


if __name__ == "__main__":
    main()
