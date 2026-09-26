"""Lightweight configuration shared by AI model acquisition and loading.

This module intentionally imports no ML frameworks so the production
pre-start process can resolve model artifacts before importing FastAPI or the
AI pipeline.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent

YOLO_MODEL_FILENAME = "yolo11n_v1_best.pt"
DINO_CHECKPOINT_FILENAME = "dinov2_vits14_v1_best.pt"

DEFAULT_YOLO_SHA256 = (
    "0ea20e9dfa6ef65f41c9f4f8125268d464662da204ff0021e483381b7138d9bf"
)
DEFAULT_DINO_SHA256 = (
    "ff9c87057d70853aaf9e68e51242c470a83ba3d34fba8efe09ea8dfc98f15c94"
)


@dataclass(frozen=True)
class ModelArtifact:
    label: str
    filename: str
    path_env: str
    url_env: str
    sha256_env: str
    default_sha256: str


YOLO_ARTIFACT = ModelArtifact(
    label="YOLO model",
    filename=YOLO_MODEL_FILENAME,
    path_env="YOLO_MODEL_PATH",
    url_env="YOLO_MODEL_URL",
    sha256_env="YOLO_MODEL_SHA256",
    default_sha256=DEFAULT_YOLO_SHA256,
)

DINO_ARTIFACT = ModelArtifact(
    label="DINO checkpoint",
    filename=DINO_CHECKPOINT_FILENAME,
    path_env="DINO_CHECKPOINT_PATH",
    url_env="DINO_CHECKPOINT_URL",
    sha256_env="DINO_CHECKPOINT_SHA256",
    default_sha256=DEFAULT_DINO_SHA256,
)

MODEL_ARTIFACTS = (YOLO_ARTIFACT, DINO_ARTIFACT)


def resolve_model_path(artifact: ModelArtifact) -> Path:
    """Resolve explicit path, shared model directory, then local default."""
    configured_path = os.getenv(artifact.path_env, "").strip()
    if configured_path:
        path = Path(configured_path).expanduser()
    else:
        configured_dir = os.getenv("AI_MODEL_DIR", "").strip()
        model_dir = (
            Path(configured_dir).expanduser()
            if configured_dir
            else BASE_DIR / "models"
        )
        path = model_dir / artifact.filename

    if not path.is_absolute():
        path = BASE_DIR / path
    return path.resolve()


def expected_model_sha256(artifact: ModelArtifact) -> str:
    """Return and validate the locked SHA-256 for an artifact."""
    expected = os.getenv(
        artifact.sha256_env,
        artifact.default_sha256,
    ).strip().lower()
    if len(expected) != 64 or any(
        character not in "0123456789abcdef" for character in expected
    ):
        raise ValueError(
            f"{artifact.sha256_env} harus berupa SHA-256 hex 64 karakter."
        )
    return expected
