"""
Load model EfficientNetV2S dan menjalankan klasifikasi gambar.
"""

import os
from pathlib import Path

import numpy as np
import tensorflow as tf
from tensorflow.keras.applications.efficientnet_v2 import (
    preprocess_input,
)

from model_downloader import ensure_model_downloaded

BASE_DIR = Path(__file__).resolve().parent

CLASS_NAMES_PATH = Path(
    os.getenv(
        "CLASS_NAMES_PATH",
        str(BASE_DIR / "class_names.txt"),
    )
)

MODEL_INPUT_SIZE = int(os.getenv("MODEL_INPUT_SIZE", "224"))


def load_class_names() -> list[str]:
    """Membaca urutan kelas yang sama dengan urutan output model."""
    if not CLASS_NAMES_PATH.exists():
        raise FileNotFoundError(
            f"File class_names.txt tidak ditemukan: {CLASS_NAMES_PATH}"
        )

    class_names = [
        line.strip()
        for line in CLASS_NAMES_PATH.read_text(
            encoding="utf-8"
        ).splitlines()
        if line.strip()
    ]

    if not class_names:
        raise ValueError("class_names.txt tidak boleh kosong.")

    return class_names


def load_sawit_model(model_path: str | None = None):
    """
    Memuat model tanpa compile karena backend hanya melakukan inferensi.
    """
    resolved_path = Path(
        model_path or ensure_model_downloaded()
    ).resolve()

    if not resolved_path.exists():
        raise FileNotFoundError(
            f"Model tidak ditemukan: {resolved_path}"
        )

    print(f"Memuat model SawitVision V3: {resolved_path}")

    return tf.keras.models.load_model(
        str(resolved_path),
        compile=False,
    )


def _resolve_target_size(model) -> tuple[int, int]:
    """
    Menggunakan ukuran input model jika tersedia.

    Jika shape model bersifat dinamis, gunakan MODEL_INPUT_SIZE dari .env.
    """
    try:
        shape = model.input_shape

        if isinstance(shape, list):
            shape = shape[0]

        height = shape[1]
        width = shape[2]

        if height and width:
            return int(height), int(width)

    except Exception:
        pass

    return MODEL_INPUT_SIZE, MODEL_INPUT_SIZE


def predict_image(
    model,
    img_path: str,
    class_names: list[str],
):
    """Melakukan prediksi dan mengembalikan kelas serta probabilitas."""
    target_size = _resolve_target_size(model)

    image = tf.keras.utils.load_img(
        img_path,
        target_size=target_size,
    )

    image_array = tf.keras.utils.img_to_array(image)
    image_array = np.expand_dims(image_array, axis=0)
    image_array = preprocess_input(image_array)

    predictions = np.asarray(
        model.predict(image_array, verbose=0)
    )[0]

    if len(predictions) != len(class_names):
        raise ValueError(
            "Jumlah output model tidak sama dengan jumlah kelas. "
            f"Output model={len(predictions)}, "
            f"class_names={len(class_names)}."
        )

    predicted_index = int(np.argmax(predictions))
    predicted_class = class_names[predicted_index]
    confidence = float(predictions[predicted_index]) * 100

    probabilities = {
        class_names[index]: float(predictions[index]) * 100
        for index in range(len(class_names))
    }

    return predicted_class, confidence, probabilities
