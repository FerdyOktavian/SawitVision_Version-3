"""Deployment security controls shared by the FastAPI routes."""

from __future__ import annotations

import hashlib
from ipaddress import ip_address
from dotenv import load_dotenv
from fastapi import HTTPException, Request, status

from config_utils import env_bool, env_choice
from rate_limit import rate_limiter


load_dotenv()


APP_ENV = env_choice(
    "APP_ENV",
    "development",
    {"development", "staging", "production", "test"},
)
IS_PRODUCTION = APP_ENV == "production"
RATE_LIMIT_ENABLED = env_bool("RATE_LIMIT_ENABLED", True)
TRUST_PROXY_HEADERS = env_bool("TRUST_PROXY_HEADERS", False)
ALLOW_INSECURE_IDENTITY_AUTH = env_bool(
    "ALLOW_INSECURE_IDENTITY_AUTH",
    not IS_PRODUCTION,
)


def require_staging_identity_auth() -> None:
    """Block the temporary name+phone login in production by default."""
    if not ALLOW_INSECURE_IDENTITY_AUTH:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Metode autentikasi sementara dinonaktifkan pada "
                "environment ini."
            ),
        )


def _valid_ip(value: str | None) -> str | None:
    if not value:
        return None
    candidate = value.strip()
    try:
        return str(ip_address(candidate))
    except ValueError:
        return None


def request_client_ip(request: Request) -> str:
    """Resolve client IP; forwarded headers are opt-in for trusted proxies."""
    if TRUST_PROXY_HEADERS:
        forwarded_for = request.headers.get("x-forwarded-for", "")
        forwarded_ip = _valid_ip(forwarded_for.split(",", 1)[0])
        if forwarded_ip:
            return forwarded_ip

        real_ip = _valid_ip(request.headers.get("x-real-ip"))
        if real_ip:
            return real_ip

    direct_ip = _valid_ip(request.client.host if request.client else None)
    return direct_ip or "unknown"


def enforce_rate_limit(
    request: Request,
    scope: str,
    *,
    limit: int,
    window_seconds: int,
    identity: str | None = None,
) -> None:
    """Apply a per-IP or privacy-preserving per-identity rate limit."""
    if not RATE_LIMIT_ENABLED:
        return

    if identity:
        identity_hash = hashlib.sha256(identity.encode("utf-8")).hexdigest()
        subject = f"identity:{identity_hash}"
    else:
        subject = f"ip:{request_client_ip(request)}"

    retry_after = rate_limiter.check(
        f"{scope}:{subject}",
        limit=limit,
        window_seconds=window_seconds,
    )
    if retry_after is not None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Terlalu banyak permintaan. Silakan coba lagi nanti.",
            headers={"Retry-After": str(retry_after)},
        )
