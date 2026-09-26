"""Safe production acquisition for the locked YOLO and DINO artifacts."""

from __future__ import annotations

import hashlib
from http.client import IncompleteRead
import logging
import os
from pathlib import Path
import socket
import tempfile
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen

from ai_model_config import (
    MODEL_ARTIFACTS,
    ModelArtifact,
    expected_model_sha256,
    resolve_model_path,
)
from config_utils import ConfigError, env_float


DEFAULT_DOWNLOAD_TIMEOUT_SECONDS = 120.0
DOWNLOAD_CHUNK_SIZE = 1024 * 1024
logger = logging.getLogger(__name__)


class ModelAcquisitionError(RuntimeError):
    """Raised when a production model cannot be safely acquired."""


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(DOWNLOAD_CHUNK_SIZE), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _download_timeout() -> float:
    try:
        return env_float(
            "AI_MODEL_DOWNLOAD_TIMEOUT_SECONDS",
            DEFAULT_DOWNLOAD_TIMEOUT_SECONDS,
            minimum=1,
            maximum=3600,
        )
    except ConfigError as error:
        raise ModelAcquisitionError(str(error)) from error


def _validated_https_url(url: str, env_name: str) -> str:
    parsed = urlsplit(url)
    if parsed.scheme.lower() != "https" or not parsed.hostname:
        raise ModelAcquisitionError(
            f"{env_name} harus berupa URL HTTPS yang valid."
        )
    if parsed.username or parsed.password:
        raise ModelAcquisitionError(
            f"{env_name} tidak boleh menyimpan credential di URL. "
            "Gunakan AI_MODEL_DOWNLOAD_TOKEN."
        )
    return f"https://{parsed.netloc}"


def _content_length(headers) -> int | None:
    raw_value = headers.get("Content-Length")
    if raw_value is None:
        return None
    try:
        value = int(raw_value)
    except (TypeError, ValueError):
        return None
    return value if value >= 0 else None


def _download_to_temp(
    *,
    artifact: ModelArtifact,
    url: str,
    destination: Path,
    expected_sha256: str,
    token: str | None,
    timeout: float,
) -> Path:
    safe_origin = _validated_https_url(url, artifact.url_env)
    headers = {"User-Agent": "SawitVisionV3-ModelDownloader/1.0"}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    try:
        destination.parent.mkdir(parents=True, exist_ok=True)
    except (TimeoutError, socket.timeout):
        raise ModelAcquisitionError(
            f"Download {artifact.label} timeout setelah {timeout:g} detik."
        ) from None
    except IncompleteRead:
        raise ModelAcquisitionError(
            f"Download {artifact.label} terputus sebelum selesai."
        ) from None
    except OSError as error:
        raise ModelAcquisitionError(
            f"Gagal membuat direktori untuk {artifact.label}: "
            f"{destination.parent}."
        ) from error

    temp_path: Path | None = None
    download_valid = False
    try:
        try:
            temp_handle = tempfile.NamedTemporaryFile(
                mode="wb",
                prefix=f".{destination.name}.",
                suffix=".download",
                dir=destination.parent,
                delete=False,
            )
        except OSError as error:
            raise ModelAcquisitionError(
                f"Gagal membuat temporary file untuk {artifact.label} "
                f"di {destination.parent}."
            ) from error

        temp_path = Path(temp_handle.name)
        logger.info(
            "model_download_started model=%s origin=%s",
            artifact.label,
            safe_origin,
        )

        request = Request(url, headers=headers, method="GET")
        try:
            response = urlopen(request, timeout=timeout)
        except HTTPError as error:
            temp_handle.close()
            raise ModelAcquisitionError(
                f"Download HTTP {artifact.label} gagal dengan status "
                f"{error.code} dari {safe_origin}."
            ) from None
        except (TimeoutError, socket.timeout):
            temp_handle.close()
            raise ModelAcquisitionError(
                f"Download {artifact.label} timeout setelah {timeout:g} detik."
            ) from None
        except URLError as error:
            temp_handle.close()
            if isinstance(error.reason, (TimeoutError, socket.timeout)):
                raise ModelAcquisitionError(
                    f"Download {artifact.label} timeout setelah "
                    f"{timeout:g} detik."
                ) from None
            raise ModelAcquisitionError(
                f"Download {artifact.label} gagal terhubung ke {safe_origin}."
            ) from None

        with temp_handle, response:
            final_scheme = urlsplit(response.geturl()).scheme.lower()
            if final_scheme != "https":
                raise ModelAcquisitionError(
                    f"Download {artifact.label} dialihkan ke URL non-HTTPS."
                )
            status_code = getattr(response, "status", 200)
            if not 200 <= int(status_code) < 300:
                raise ModelAcquisitionError(
                    f"Download HTTP {artifact.label} gagal dengan status "
                    f"{status_code} dari {safe_origin}."
                )

            expected_size = _content_length(response.headers)
            downloaded_size = 0
            while True:
                chunk = response.read(DOWNLOAD_CHUNK_SIZE)
                if not chunk:
                    break
                temp_handle.write(chunk)
                downloaded_size += len(chunk)
            temp_handle.flush()
            os.fsync(temp_handle.fileno())

        if expected_size is not None and downloaded_size != expected_size:
            raise ModelAcquisitionError(
                f"Ukuran download {artifact.label} tidak cocok: "
                f"expected={expected_size}, actual={downloaded_size}."
            )
        if downloaded_size == 0:
            raise ModelAcquisitionError(
                f"Download {artifact.label} menghasilkan file kosong."
            )

        actual_sha256 = sha256_file(temp_path)
        if actual_sha256.lower() != expected_sha256.lower():
            raise ModelAcquisitionError(
                f"SHA-256 hasil download {artifact.label} tidak cocok: "
                f"expected={expected_sha256.lower()}, "
                f"actual={actual_sha256.lower()}."
            )
        download_valid = True
        return temp_path
    except OSError as error:
        raise ModelAcquisitionError(
            f"Gagal menulis {artifact.label} ke disk di "
            f"{destination.parent}."
        ) from error
    finally:
        if not download_valid and temp_path is not None and temp_path.exists():
            try:
                temp_path.unlink()
            except OSError:
                pass


def ensure_model_artifact(artifact: ModelArtifact) -> Path:
    """Ensure one locked artifact exists locally with its expected hash."""
    destination = resolve_model_path(artifact)
    try:
        expected_sha256 = expected_model_sha256(artifact)
    except ValueError as error:
        raise ModelAcquisitionError(str(error)) from error

    if destination.is_file():
        try:
            existing_sha256 = sha256_file(destination)
        except OSError as error:
            raise ModelAcquisitionError(
                f"Gagal membaca existing {artifact.label}: {destination}."
            ) from error
        if existing_sha256.lower() == expected_sha256:
            logger.info(
                "model_artifact_ready model=%s sha256_verified=true cached=true",
                artifact.label,
            )
            os.environ[artifact.path_env] = str(destination)
            return destination
        logger.warning(
            "model_artifact_invalid model=%s replacement_required=true",
            artifact.label,
        )

    url = os.getenv(artifact.url_env, "").strip()
    if not url:
        existing_note = (
            " Existing file juga memiliki SHA-256 yang tidak valid."
            if destination.exists()
            else ""
        )
        raise ModelAcquisitionError(
            f"{artifact.url_env} belum diset dan {artifact.label} tidak "
            f"tersedia secara valid di {destination}.{existing_note}"
        )

    token = os.getenv("AI_MODEL_DOWNLOAD_TOKEN", "").strip() or None
    downloaded_path = _download_to_temp(
        artifact=artifact,
        url=url,
        destination=destination,
        expected_sha256=expected_sha256,
        token=token,
        timeout=_download_timeout(),
    )
    try:
        try:
            os.replace(downloaded_path, destination)
        except OSError as error:
            raise ModelAcquisitionError(
                f"Gagal memindahkan hasil download {artifact.label} secara "
                f"atomic ke {destination}."
            ) from error
    finally:
        if downloaded_path.exists():
            try:
                downloaded_path.unlink()
            except OSError:
                pass

    if not destination.is_file():
        raise ModelAcquisitionError(
            f"{artifact.label} tidak ditemukan setelah acquisition: "
            f"{destination}."
        )
    os.environ[artifact.path_env] = str(destination)
    logger.info(
        "model_artifact_ready model=%s sha256_verified=true cached=false",
        artifact.label,
    )
    return destination


def ensure_production_models() -> dict[str, Path]:
    """Acquire every active model before FastAPI imports the AI pipeline."""
    resolved = {}
    for artifact in MODEL_ARTIFACTS:
        resolved[artifact.path_env] = ensure_model_artifact(artifact)
    return resolved
