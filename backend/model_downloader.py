"""
Menyiapkan file model EfficientNetV2S untuk SawitVision V3.

Prioritas:
1. model lokal di folder models;
2. model lokal di root backend;
3. download dari Hugging Face jika model belum tersedia.
"""

import os
from pathlib import Path

from dotenv import load_dotenv
from huggingface_hub import hf_hub_download

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent

HF_MODEL_REPO = os.getenv(
    "HF_MODEL_REPO",
    "",
).strip()

HF_MODEL_FILENAME = os.getenv(
    "HF_MODEL_FILENAME",
    "model_sawit.keras",
).strip()

HF_TOKEN = os.getenv("HF_TOKEN") or None

local_dir_value = os.getenv("LOCAL_MODEL_DIR", "models")
LOCAL_MODEL_DIR = Path(local_dir_value)

if not LOCAL_MODEL_DIR.is_absolute():
    LOCAL_MODEL_DIR = BASE_DIR / LOCAL_MODEL_DIR

LOCAL_MODEL_PATH = LOCAL_MODEL_DIR / HF_MODEL_FILENAME


def find_existing_model() -> Path | None:
    """Mencari model pada beberapa lokasi yang umum digunakan."""
    candidates = [
        LOCAL_MODEL_PATH,
        BASE_DIR / HF_MODEL_FILENAME,
    ]

    for candidate in candidates:
        if candidate.exists() and candidate.is_file():
            return candidate.resolve()

    return None


def ensure_model_downloaded() -> str:
    """Mengembalikan path model lokal atau mengunduhnya dari Hugging Face."""
    existing_model = find_existing_model()

    if existing_model:
        print(f"Model ditemukan: {existing_model}")
        return str(existing_model)

    if not HF_MODEL_REPO:
        raise FileNotFoundError(
            "Model belum ditemukan. Taruh file model di folder "
            f"'{LOCAL_MODEL_DIR}' atau isi HF_MODEL_REPO di .env."
        )

    LOCAL_MODEL_DIR.mkdir(parents=True, exist_ok=True)

    print(
        "Model belum tersedia. Mengunduh dari Hugging Face Hub..."
    )

    downloaded_path = hf_hub_download(
        repo_id=HF_MODEL_REPO,
        filename=HF_MODEL_FILENAME,
        token=HF_TOKEN,
        local_dir=str(LOCAL_MODEL_DIR),
    )

    final_path = Path(downloaded_path).resolve()

    if not final_path.exists():
        raise FileNotFoundError(
            f"Download selesai, tetapi model tidak ditemukan: {final_path}"
        )

    print(f"Model berhasil disiapkan: {final_path}")
    return str(final_path)
