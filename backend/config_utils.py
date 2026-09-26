"""Small, secret-safe environment parsing helpers for production runtime."""

from __future__ import annotations

import math
import os
from urllib.parse import urlsplit


class ConfigError(ValueError):
    """Raised when an environment variable has an invalid configuration."""


def env_text(
    name: str,
    default: str | None = None,
    *,
    required: bool = False,
) -> str | None:
    raw_value = os.getenv(name)
    if raw_value is None or not raw_value.strip():
        if required:
            raise ConfigError(f"Environment variable {name} wajib diisi.")
        return default
    return raw_value.strip()


def env_int(
    name: str,
    default: int,
    *,
    minimum: int | None = None,
    maximum: int | None = None,
) -> int:
    raw_value = env_text(name, str(default))
    try:
        value = int(raw_value)
    except (TypeError, ValueError) as error:
        raise ConfigError(f"Environment variable {name} harus berupa integer.") from error
    if minimum is not None and value < minimum:
        raise ConfigError(f"Environment variable {name} minimal {minimum}.")
    if maximum is not None and value > maximum:
        raise ConfigError(f"Environment variable {name} maksimal {maximum}.")
    return value


def env_float(
    name: str,
    default: float,
    *,
    minimum: float | None = None,
    maximum: float | None = None,
) -> float:
    raw_value = env_text(name, str(default))
    try:
        value = float(raw_value)
    except (TypeError, ValueError) as error:
        raise ConfigError(f"Environment variable {name} harus berupa angka.") from error
    if not math.isfinite(value):
        raise ConfigError(f"Environment variable {name} harus finite.")
    if minimum is not None and value < minimum:
        raise ConfigError(f"Environment variable {name} minimal {minimum:g}.")
    if maximum is not None and value > maximum:
        raise ConfigError(f"Environment variable {name} maksimal {maximum:g}.")
    return value


def env_bool(name: str, default: bool) -> bool:
    raw_value = env_text(name)
    if raw_value is None:
        return default
    normalized = raw_value.lower()
    if normalized in {"1", "true", "yes", "on"}:
        return True
    if normalized in {"0", "false", "no", "off"}:
        return False
    raise ConfigError(f"Environment variable {name} harus berupa true/false.")


def env_choice(
    name: str,
    default: str,
    choices: set[str],
) -> str:
    value = str(env_text(name, default)).lower()
    if value not in choices:
        allowed = ", ".join(sorted(choices))
        raise ConfigError(
            f"Environment variable {name} harus salah satu dari: {allowed}."
        )
    return value


def env_http_url(
    name: str,
    default: str | None = None,
    *,
    required: bool = False,
    https_only: bool = False,
) -> str | None:
    value = env_text(name, default, required=required)
    if value is None:
        return None
    parsed = urlsplit(value)
    allowed_schemes = {"https"} if https_only else {"http", "https"}
    if parsed.scheme.lower() not in allowed_schemes or not parsed.netloc:
        scheme_note = "HTTPS" if https_only else "HTTP/HTTPS"
        raise ConfigError(
            f"Environment variable {name} harus berupa URL {scheme_note} yang valid."
        )
    return value


def cors_origins() -> list[str]:
    raw_value = str(env_text("CORS_ORIGINS", "http://localhost:5173"))
    origins = [item.strip() for item in raw_value.split(",") if item.strip()]
    if not origins:
        raise ConfigError("Environment variable CORS_ORIGINS tidak boleh kosong.")
    for origin in origins:
        if origin == "*":
            raise ConfigError(
                "Environment variable CORS_ORIGINS tidak boleh memakai wildcard."
            )
        parsed = urlsplit(origin)
        if (
            parsed.scheme.lower() not in {"http", "https"}
            or not parsed.netloc
            or parsed.path
            or parsed.query
            or parsed.fragment
            or parsed.username
            or parsed.password
        ):
            raise ConfigError(
                "Setiap nilai CORS_ORIGINS harus berupa origin HTTP/HTTPS tanpa "
                "path, query, fragment, atau credential."
            )
    return origins


def validate_startup_config() -> None:
    """Validate production entrypoint settings without printing secret values."""
    app_env = env_choice(
        "APP_ENV",
        "development",
        {"development", "staging", "production", "test"},
    )
    env_int("PORT", 8000, minimum=1, maximum=65535)
    env_choice(
        "LOG_LEVEL",
        "INFO",
        {"debug", "info", "warning", "error", "critical"},
    )

    env_text("DATABASE_URL", required=True)
    env_int("DB_POOL_SIZE", 5, minimum=1, maximum=50)
    env_int("DB_MAX_OVERFLOW", 5, minimum=0, maximum=100)
    db_sslmode = env_choice(
        "DB_SSLMODE",
        "require",
        {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"},
    )
    if app_env == "production" and db_sslmode not in {
        "require",
        "verify-ca",
        "verify-full",
    }:
        raise ConfigError(
            "Environment variable DB_SSLMODE production harus mengaktifkan SSL."
        )

    jwt_secret = str(env_text("JWT_SECRET_KEY", required=True))
    if app_env == "production" and len(jwt_secret) < 32:
        raise ConfigError("JWT_SECRET_KEY production harus minimal 32 karakter.")
    env_choice("JWT_ALGORITHM", "HS256", {"hs256", "hs384", "hs512"})
    env_int("JWT_EXPIRE_MINUTES", 10080, minimum=1, maximum=525600)
    origins = cors_origins()
    if app_env == "production" and any(
        urlsplit(origin).scheme.lower() != "https" for origin in origins
    ):
        raise ConfigError(
            "Environment variable CORS_ORIGINS production harus memakai HTTPS."
        )

    if app_env == "production":
        env_http_url("SUPABASE_URL", required=True, https_only=True)
        env_text("SUPABASE_SERVICE_ROLE_KEY", required=True)

    env_text("AI_DEVICE", "auto")
    env_int("YOLO_IMGSZ", 640, minimum=32, maximum=8192)
    env_float("YOLO_CONFIDENCE", 0.40, minimum=0, maximum=1)
    env_float("YOLO_IOU", 0.50, minimum=0, maximum=1)
    env_int("AI_MIN_CROP_SIZE", 8, minimum=1, maximum=8192)
    env_int("DINO_BATCH_SIZE", 8, minimum=1, maximum=1024)
    env_bool("AI_USE_AMP", True)
    verify_model_hash = env_bool("AI_VERIFY_MODEL_SHA256", True)
    if app_env == "production" and not verify_model_hash:
        raise ConfigError(
            "Environment variable AI_VERIFY_MODEL_SHA256 wajib true di production."
        )
    env_bool("AI_ANNOTATE_DETECTOR_CONFIDENCE", False)
    env_float(
        "AI_MODEL_DOWNLOAD_TIMEOUT_SECONDS",
        120,
        minimum=1,
        maximum=3600,
    )

    env_bool("GEOCODING_ENABLED", True)
    env_choice("GEOCODING_PROVIDER", "nominatim", {"nominatim"})
    env_float("GEOCODING_TIMEOUT_SECONDS", 5, minimum=0.5, maximum=30)
    env_http_url(
        "GEOCODING_NOMINATIM_URL",
        "https://nominatim.openstreetmap.org/reverse",
    )
    env_text("GEOCODING_USER_AGENT", "SawitVisionV3/1.0")
    env_text("GEOCODING_LANGUAGE", "id")

    env_float("APP_STORAGE_LIMIT_GB", 1, minimum=0.01)
    env_float("MIN_SAVE_CONFIDENCE", 70, minimum=0, maximum=100)
    env_bool("ALLOW_INSECURE_IDENTITY_AUTH", app_env != "production")
    env_bool("ENABLE_API_DOCS", app_env != "production")
    env_bool("RATE_LIMIT_ENABLED", True)
    env_bool("TRUST_PROXY_HEADERS", False)
