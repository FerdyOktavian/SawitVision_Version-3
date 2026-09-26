import hashlib
import os
import shutil
import urllib.request
from pathlib import Path


MODEL_DIR = Path("/app/models")
MODEL_DIR.mkdir(parents=True, exist_ok=True)


MODELS = [
    {
        "name": "YOLO11n V1",
        "filename": "yolo11n_v1_best.pt",
        "url_env": "YOLO_MODEL_URL",
        "sha_env": "YOLO_MODEL_SHA256",
    },
    {
        "name": "DINOv2 ViT-S/14",
        "filename": "dinov2_vits14_v1_best.pt",
        "url_env": "DINO_CHECKPOINT_URL",
        "sha_env": "DINO_CHECKPOINT_SHA256",
    },
]


def sha256_file(path: Path) -> str:
    sha = hashlib.sha256()

    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            sha.update(chunk)

    return sha.hexdigest()


def download_file(url: str, destination: Path):
    temp_path = destination.with_suffix(destination.suffix + ".tmp")

    print(f"[MODEL] Downloading: {destination.name}")
    print(f"[MODEL] From: {url}")

    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": "SawitVisionV3/1.0",
        },
    )

    try:
        with urllib.request.urlopen(request, timeout=300) as response:
            with temp_path.open("wb") as output:
                shutil.copyfileobj(response, output)

        temp_path.replace(destination)

    except Exception:
        if temp_path.exists():
            temp_path.unlink()
        raise


def prepare_model(model: dict):
    destination = MODEL_DIR / model["filename"]

    url = os.getenv(model["url_env"], "").strip()
    expected_sha = os.getenv(model["sha_env"], "").strip().lower()

    if destination.exists():
        print(f"[MODEL] Existing file found: {destination}")

        if expected_sha:
            actual_sha = sha256_file(destination)

            if actual_sha == expected_sha:
                print(f"[MODEL] SHA256 OK: {model['name']}")
                return

            print(f"[MODEL] SHA256 mismatch. Download ulang: {model['name']}")
            destination.unlink()
        else:
            return

    if not url:
        raise RuntimeError(
            f"{model['url_env']} belum diatur untuk {model['name']}"
        )

    download_file(url, destination)

    if not destination.exists():
        raise RuntimeError(
            f"Download gagal: {destination}"
        )

    if expected_sha:
        actual_sha = sha256_file(destination)

        if actual_sha != expected_sha:
            destination.unlink(missing_ok=True)

            raise RuntimeError(
                f"SHA256 {model['name']} tidak cocok.\n"
                f"Expected: {expected_sha}\n"
                f"Actual:   {actual_sha}"
            )

        print(f"[MODEL] SHA256 OK: {model['name']}")

    size_mb = destination.stat().st_size / (1024 * 1024)

    print(
        f"[MODEL] Ready: {model['name']} "
        f"({size_mb:.2f} MB)"
    )


def main():
    print("[MODEL] Preparing AI model files...")

    for model in MODELS:
        prepare_model(model)

    print("[MODEL] Semua model siap.")


if __name__ == "__main__":
    main()