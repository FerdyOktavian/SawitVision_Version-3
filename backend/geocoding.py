"""Optional backend-side reverse geocoding for prediction coordinates."""

import json
import logging
import math
import os
from json import JSONDecodeError
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen


DEFAULT_NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse"
MAX_PROVIDER_RESPONSE_BYTES = 256 * 1024
MAX_LOCATION_NAME_LENGTH = 500
MAX_COMPONENTS = 40
MAX_COMPONENT_VALUE_LENGTH = 200
SAFE_FAILURE_WARNING = "Nama lokasi otomatis tidak tersedia."
logger = logging.getLogger(__name__)


def _is_enabled(value: str | None) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on"}


def _safe_timeout(value: str | None) -> float:
    try:
        timeout = float(value or "5")
    except (TypeError, ValueError):
        return 5.0

    if not math.isfinite(timeout):
        return 5.0

    return min(max(timeout, 0.5), 30.0)


def validate_coordinates(latitude: Any, longitude: Any) -> tuple[float, float]:
    """Return finite coordinates within WGS84 ranges or raise ValueError."""
    try:
        latitude_value = float(latitude)
        longitude_value = float(longitude)
    except (TypeError, ValueError) as error:
        raise ValueError("Koordinat lokasi tidak valid.") from error

    if (
        not math.isfinite(latitude_value)
        or not math.isfinite(longitude_value)
        or not -90 <= latitude_value <= 90
        or not -180 <= longitude_value <= 180
    ):
        raise ValueError("Koordinat lokasi berada di luar batas.")

    return latitude_value, longitude_value


def _failure_result(warning: str = SAFE_FAILURE_WARNING) -> dict[str, Any]:
    return {
        "success": False,
        "display_name": None,
        "components": {},
        "warning": warning,
    }


def _sanitize_components(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}

    components = {}
    for key, component_value in value.items():
        if len(components) >= MAX_COMPONENTS:
            break
        if not isinstance(key, str) or not isinstance(
            component_value, (str, int, float)
        ):
            continue

        safe_key = key.strip()[:80]
        safe_value = " ".join(str(component_value).split())[
            :MAX_COMPONENT_VALUE_LENGTH
        ]
        if safe_key and safe_value:
            components[safe_key] = safe_value

    return components


def _nominatim_reverse(latitude: float, longitude: float) -> dict[str, Any]:
    endpoint = os.getenv(
        "GEOCODING_NOMINATIM_URL", DEFAULT_NOMINATIM_URL
    ).strip()
    parsed_endpoint = urlparse(endpoint)
    if parsed_endpoint.scheme not in {"http", "https"} or not parsed_endpoint.netloc:
        return _failure_result()

    query = urlencode(
        {
            "lat": f"{latitude:.8f}",
            "lon": f"{longitude:.8f}",
            "format": "jsonv2",
            "addressdetails": "1",
            "accept-language": os.getenv("GEOCODING_LANGUAGE", "id").strip()
            or "id",
        }
    )
    separator = "&" if parsed_endpoint.query else "?"
    request = Request(
        f"{endpoint}{separator}{query}",
        headers={
            "Accept": "application/json",
            "User-Agent": os.getenv(
                "GEOCODING_USER_AGENT", "SawitVisionV3/1.0"
            ).strip()
            or "SawitVisionV3/1.0",
        },
        method="GET",
    )

    try:
        with urlopen(
            request,
            timeout=_safe_timeout(os.getenv("GEOCODING_TIMEOUT_SECONDS")),
        ) as response:
            raw_body = response.read(MAX_PROVIDER_RESPONSE_BYTES + 1)
        if len(raw_body) > MAX_PROVIDER_RESPONSE_BYTES:
            return _failure_result()

        payload = json.loads(raw_body.decode("utf-8"))
        if not isinstance(payload, dict):
            return _failure_result()

        display_name = " ".join(str(payload.get("display_name") or "").split())
        if not display_name:
            return _failure_result()

        return {
            "success": True,
            "display_name": display_name[:MAX_LOCATION_NAME_LENGTH],
            "components": _sanitize_components(payload.get("address")),
        }
    except (
        HTTPError,
        URLError,
        TimeoutError,
        OSError,
        UnicodeDecodeError,
        JSONDecodeError,
        ValueError,
    ) as error:
        logger.warning(
            "reverse_geocoding_provider_failed failure_type=%s",
            type(error).__name__,
        )
        return _failure_result()


def reverse_geocode(latitude: Any, longitude: Any) -> dict[str, Any]:
    """Resolve a safe display name without making geocoding mandatory."""
    try:
        latitude_value, longitude_value = validate_coordinates(
            latitude, longitude
        )
    except ValueError:
        return _failure_result("Koordinat lokasi tidak valid.")

    if not _is_enabled(os.getenv("GEOCODING_ENABLED", "true")):
        return _failure_result("Pencarian nama lokasi otomatis dinonaktifkan.")

    provider = os.getenv("GEOCODING_PROVIDER", "nominatim").strip().lower()
    if provider == "nominatim":
        try:
            return _nominatim_reverse(latitude_value, longitude_value)
        except Exception:
            logger.error("reverse_geocoding_unexpected_failure")
            return _failure_result()

    return _failure_result("Provider nama lokasi tidak didukung.")
