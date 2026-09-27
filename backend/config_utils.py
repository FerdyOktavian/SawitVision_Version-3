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
