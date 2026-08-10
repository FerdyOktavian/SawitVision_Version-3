"""
Penyimpanan gambar prediksi ke Supabase Storage SawitVision V3.

Gunakan SUPABASE_SERVICE_ROLE_KEY hanya pada backend. Jangan pernah
memasukkan service role key ke frontend React atau repository GitHub.
"""

import os
from datetime import datetime, timezone
from functools import lru_cache
from io import BytesIO
from typing import Optional
from urllib.parse import unquote

from dotenv import load_dotenv
from PIL import Image, ImageOps
from supabase import Client, create_client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv(
    "SUPABASE_SERVICE_ROLE_KEY"
)
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
SUPABASE_BUCKET = os.getenv(
    "SUPABASE_BUCKET",
    "sawitvision-v3-images",
)


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Membuat satu client Supabase yang dipakai ulang oleh backend.

    Service role key diprioritaskan karena proses upload dan delete
    dilakukan oleh server FastAPI, bukan langsung oleh browser.
    """
    if not SUPABASE_URL:
        raise RuntimeError("SUPABASE_URL belum diisi di file .env.")

    key = SUPABASE_SERVICE_ROLE_KEY or SUPABASE_KEY

    if not key:
        raise RuntimeError(
            "SUPABASE_SERVICE_ROLE_KEY belum diisi di file .env."
        )

    if not SUPABASE_BUCKET:
        raise RuntimeError("SUPABASE_BUCKET belum diisi di file .env.")

    return create_client(SUPABASE_URL, key)


def image_to_webp_bytes(
    image: Image.Image,
    max_size: int,
    quality: int,
) -> tuple[bytes, tuple[int, int]]:
    """Memperbaiki orientasi, resize, lalu mengompres gambar ke WebP."""
    normalized = ImageOps.exif_transpose(image).convert("RGB")
    normalized.thumbnail((max_size, max_size))

    buffer = BytesIO()
    normalized.save(
        buffer,
        format="WEBP",
        quality=quality,
        method=6,
        optimize=True,
    )

    return buffer.getvalue(), normalized.size


def make_storage_paths(record_id: str) -> dict[str, str]:
    """Membuat folder storage berdasarkan tanggal dan ID prediksi."""
    now = datetime.now(timezone.utc)

    base_path = (
        f"predictions/{now.year}/"
        f"{now.month:02d}/{now.day:02d}/{record_id}"
    )

    return {
        "processed_path": f"{base_path}/processed.webp",
        "thumbnail_path": f"{base_path}/thumbnail.webp",
    }


def _public_url_to_string(public_url) -> str:
    """Menormalkan bentuk respons get_public_url antarversi library."""
    if isinstance(public_url, str):
        return public_url

    if isinstance(public_url, dict):
        return (
            public_url.get("publicUrl")
            or public_url.get("public_url")
            or str(public_url)
        )

    if hasattr(public_url, "public_url"):
        return str(public_url.public_url)

    return str(public_url)


def upload_bytes_to_supabase(
    file_bytes: bytes,
    storage_path: str,
) -> str:
    """Mengunggah satu object WebP dan mengembalikan public URL."""
    bucket = get_supabase_client().storage.from_(SUPABASE_BUCKET)

    file_options = {
        "content-type": "image/webp",
        "cache-control": "3600",
        "upsert": "false",
    }

    try:
        # Format terbaru supabase-py.
        bucket.upload(
            path=storage_path,
            file=file_bytes,
            file_options=file_options,
        )
    except TypeError:
        # Fallback untuk versi supabase-py yang lebih lama.
        bucket.upload(
            storage_path,
            file_bytes,
            file_options,
        )

    return _public_url_to_string(
        bucket.get_public_url(storage_path)
    )


def upload_prediction_images(
    image: Image.Image,
    record_id: str,
) -> dict:
    """Menyimpan gambar processed dan thumbnail."""
    paths = make_storage_paths(record_id)

    processed_bytes, processed_size = image_to_webp_bytes(
        image=image,
        max_size=1024,
        quality=82,
    )

    thumbnail_bytes, thumbnail_size = image_to_webp_bytes(
        image=image,
        max_size=320,
        quality=75,
    )

    processed_url = upload_bytes_to_supabase(
        processed_bytes,
        paths["processed_path"],
    )

    try:
        thumbnail_url = upload_bytes_to_supabase(
            thumbnail_bytes,
            paths["thumbnail_path"],
        )
    except Exception:
        # Hindari meninggalkan processed image ketika thumbnail gagal.
        try:
            get_supabase_client().storage.from_(
                SUPABASE_BUCKET
            ).remove([paths["processed_path"]])
        except Exception:
            pass
        raise

    return {
        "image_processed_url": processed_url,
        "image_thumbnail_url": thumbnail_url,
        "processed_size": processed_size,
        "thumbnail_size": thumbnail_size,
        "processed_bytes": len(processed_bytes),
        "thumbnail_bytes": len(thumbnail_bytes),
    }


def extract_supabase_storage_path(
    file_url: Optional[str],
) -> Optional[str]:
    """Mengambil object path dari public URL Supabase."""
    if not file_url:
        return None

    cleaned_url = file_url.strip()

    if cleaned_url.startswith("predictions/"):
        return cleaned_url

    markers = (
        f"/storage/v1/object/public/{SUPABASE_BUCKET}/",
        f"/storage/v1/object/sign/{SUPABASE_BUCKET}/",
    )

    for marker in markers:
        if marker in cleaned_url:
            path = cleaned_url.split(marker, 1)[1]
            path = path.split("?", 1)[0]
            return unquote(path)

    return None


def delete_storage_paths_from_supabase(
    paths: list[str],
) -> dict:
    """Menghapus sekumpulan object path dari bucket."""
    clean_paths = [
        path.strip()
        for path in dict.fromkeys(paths or [])
        if isinstance(path, str) and path.strip()
    ]

    if not clean_paths:
        return {
            "deleted_paths": [],
            "message": "Tidak ada path storage yang dapat dihapus.",
        }

    get_supabase_client().storage.from_(
        SUPABASE_BUCKET
    ).remove(clean_paths)

    return {
        "deleted_paths": clean_paths,
        "message": "Object storage berhasil dihapus.",
    }


def delete_prediction_images_from_supabase(
    image_processed_url: Optional[str] = None,
    image_thumbnail_url: Optional[str] = None,
) -> dict:
    """Menghapus processed image dan thumbnail berdasarkan URL database."""
    paths = []

    processed_path = extract_supabase_storage_path(
        image_processed_url
    )
    thumbnail_path = extract_supabase_storage_path(
        image_thumbnail_url
    )

    if processed_path:
        paths.append(processed_path)

    if thumbnail_path:
        paths.append(thumbnail_path)

    return delete_storage_paths_from_supabase(paths)
