"""
Operasi database untuk prediksi SawitVision V3.

Semua query memakai tabel pada schema public Supabase PostgreSQL.
"""

from typing import Any, Optional

from sqlalchemy import text
from sqlalchemy.orm import Session


def get_active_model_version(db: Session) -> Optional[str]:
    """Mengambil ID model yang sedang aktif."""
    row = db.execute(
        text(
            """
            SELECT id
            FROM public.model_versions
            WHERE is_active = TRUE
            ORDER BY created_at DESC
            LIMIT 1
            """
        )
    ).fetchone()

    return str(row[0]) if row else None


def save_prediction_record(
    db: Session,
    predicted_class: str,
    confidence: float,
    probabilities: dict[str, float],
    user_id: Optional[str] = None,
    image_original_url: Optional[str] = None,
    image_processed_url: Optional[str] = None,
    image_thumbnail_url: Optional[str] = None,
    input_source: str = "unknown",
    image_width: Optional[int] = None,
    image_height: Optional[int] = None,
    file_size_bytes: Optional[int] = None,
    device_info: Optional[dict[str, Any]] = None,
    notes: Optional[str] = None,
) -> dict[str, Any]:
    """Menyimpan satu hasil prediksi ke riwayat."""
    model_version_id = get_active_model_version(db)

    try:
        row = db.execute(
            text(
                """
                INSERT INTO public.prediction_records (
                    model_version_id,
                    user_id,
                    image_original_url,
                    image_processed_url,
                    image_thumbnail_url,
                    predicted_class,
                    confidence,
                    prob_belum_masak,
                    prob_masak,
                    prob_terlalu_masak,
                    input_source,
                    image_width,
                    image_height,
                    file_size_bytes,
                    device_info,
                    notes
                )
                VALUES (
                    :model_version_id,
                    :user_id,
                    :image_original_url,
                    :image_processed_url,
                    :image_thumbnail_url,
                    :predicted_class,
                    :confidence,
                    :prob_belum_masak,
                    :prob_masak,
                    :prob_terlalu_masak,
                    :input_source,
                    :image_width,
                    :image_height,
                    :file_size_bytes,
                    CAST(:device_info AS JSONB),
                    :notes
                )
                RETURNING id, created_at
                """
            ),
            {
                "model_version_id": model_version_id,
                "user_id": user_id,
                "image_original_url": image_original_url,
                "image_processed_url": image_processed_url,
                "image_thumbnail_url": image_thumbnail_url,
                "predicted_class": predicted_class,
                "confidence": float(confidence),
                "prob_belum_masak": float(
                    probabilities.get("belum_masak", 0)
                ),
                "prob_masak": float(probabilities.get("masak", 0)),
                "prob_terlalu_masak": float(
                    probabilities.get("terlalu_masak", 0)
                ),
                "input_source": input_source,
                "image_width": image_width,
                "image_height": image_height,
                "file_size_bytes": file_size_bytes,
                "device_info": __import__("json").dumps(
                    device_info or {},
                    ensure_ascii=False,
                    default=str,
                ),
                "notes": notes,
            },
        ).fetchone()

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "id": str(row[0]),
        "created_at": (
            row[1].isoformat()
            if row[1]
            else None
        ),
    }


def _prediction_row_to_dict(row) -> dict[str, Any]:
    """Mengubah hasil query menjadi bentuk JSON yang dipakai frontend."""
    return {
        "id": str(row[0]),
        "image_processed_url": row[1],
        "image_thumbnail_url": row[2],
        "predicted_class": row[3],
        "confidence": float(row[4] or 0),
        "probabilities": {
            "belum_masak": float(row[5] or 0),
            "masak": float(row[6] or 0),
            "terlalu_masak": float(row[7] or 0),
        },
        "input_source": row[8],
        "image_width": row[9],
        "image_height": row[10],
        "file_size_bytes": int(row[11] or 0),
        "created_at": row[12].isoformat() if row[12] else None,
    }


def get_prediction_records(
    db: Session,
    user_id: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[dict[str, Any]]:
    """Mengambil daftar riwayat prediksi."""
    where_sql = "WHERE user_id = :user_id" if user_id else ""

    rows = db.execute(
        text(
            f"""
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                confidence,
                prob_belum_masak,
                prob_masak,
                prob_terlalu_masak,
                input_source,
                image_width,
                image_height,
                file_size_bytes,
                created_at
            FROM public.prediction_records
            {where_sql}
            ORDER BY created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        {
            "user_id": user_id,
            "limit": max(1, min(int(limit), 100)),
            "offset": max(0, int(offset)),
        },
    ).fetchall()

    return [_prediction_row_to_dict(row) for row in rows]


def count_prediction_records(
    db: Session,
    user_id: Optional[str] = None,
) -> int:
    """Menghitung jumlah prediksi, global atau per pengguna."""
    if user_id:
        total = db.execute(
            text(
                """
                SELECT COUNT(*)
                FROM public.prediction_records
                WHERE user_id = :user_id
                """
            ),
            {"user_id": user_id},
        ).scalar()
    else:
        total = db.execute(
            text("SELECT COUNT(*) FROM public.prediction_records")
        ).scalar()

    return int(total or 0)


def get_prediction_record_by_id(
    db: Session,
    record_id: str,
    user_id: Optional[str] = None,
) -> Optional[dict[str, Any]]:
    """
    Mengambil detail prediksi.

    user_id digunakan agar pengguna hanya dapat membuka datanya sendiri.
    """
    user_filter = "AND user_id = :user_id" if user_id else ""

    row = db.execute(
        text(
            f"""
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                confidence,
                prob_belum_masak,
                prob_masak,
                prob_terlalu_masak,
                input_source,
                image_width,
                image_height,
                file_size_bytes,
                created_at
            FROM public.prediction_records
            WHERE id = :record_id
            {user_filter}
            LIMIT 1
            """
        ),
        {
            "record_id": record_id,
            "user_id": user_id,
        },
    ).fetchone()

    return _prediction_row_to_dict(row) if row else None


def get_prediction_stats(
    db: Session,
    user_id: Optional[str] = None,
) -> dict[str, Any]:
    """Mengambil statistik total dan rata-rata confidence per kelas."""
    user_filter = "WHERE user_id = :user_id" if user_id else ""
    params = {"user_id": user_id}

    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM public.prediction_records
            {user_filter}
            """
        ),
        params,
    ).scalar()

    rows = db.execute(
        text(
            f"""
            SELECT
                predicted_class,
                COUNT(*) AS total,
                AVG(confidence) AS avg_confidence
            FROM public.prediction_records
            {user_filter}
            GROUP BY predicted_class
            ORDER BY total DESC
            """
        ),
        params,
    ).fetchall()

    by_class = {
        row[0]: {
            "total": int(row[1]),
            "avg_confidence": round(float(row[2] or 0), 2),
        }
        for row in rows
    }

    return {
        "total_predictions": int(total or 0),
        "by_class": by_class,
    }


def update_prediction_images(
    db: Session,
    record_id: str,
    image_processed_url: Optional[str] = None,
    image_thumbnail_url: Optional[str] = None,
) -> bool:
    """Menyimpan URL gambar setelah upload ke Supabase Storage."""
    try:
        row = db.execute(
            text(
                """
                UPDATE public.prediction_records
                SET
                    image_processed_url = :image_processed_url,
                    image_thumbnail_url = :image_thumbnail_url,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :record_id
                RETURNING id
                """
            ),
            {
                "record_id": record_id,
                "image_processed_url": image_processed_url,
                "image_thumbnail_url": image_thumbnail_url,
            },
        ).fetchone()

        db.commit()
        return row is not None

    except Exception:
        db.rollback()
        raise


def delete_prediction_record(
    db: Session,
    record_id: str,
) -> Optional[str]:
    """Menghapus satu record riwayat prediksi."""
    try:
        row = db.execute(
            text(
                """
                DELETE FROM public.prediction_records
                WHERE id = :record_id
                RETURNING id
                """
            ),
            {"record_id": record_id},
        ).fetchone()

        db.commit()

    except Exception:
        db.rollback()
        raise

    return str(row[0]) if row else None


def get_estimated_storage_usage(db: Session) -> int:
    """
    Mengestimasi pemakaian storage dari ukuran file asli.

    Main.py memakai perkiraan 60% untuk gambar processed dan 10%
    untuk thumbnail, sehingga total estimasinya 70% dari file asli.
    """
    original_bytes = int(
        db.execute(
            text(
                """
                SELECT COALESCE(SUM(file_size_bytes), 0)
                FROM public.prediction_records
                WHERE image_processed_url IS NOT NULL
                   OR image_thumbnail_url IS NOT NULL
                """
            )
        ).scalar()
        or 0
    )

    return int(original_bytes * 0.70)


def get_oldest_prediction_images(
    db: Session,
    limit: int = 10,
) -> list[dict[str, Any]]:
    """Mengambil gambar prediksi tertua untuk fitur cleanup admin."""
    rows = db.execute(
        text(
            """
            SELECT
                id,
                image_processed_url,
                image_thumbnail_url,
                predicted_class,
                created_at
            FROM public.prediction_records
            WHERE image_processed_url IS NOT NULL
               OR image_thumbnail_url IS NOT NULL
            ORDER BY created_at ASC
            LIMIT :limit
            """
        ),
        {"limit": max(1, min(int(limit), 100))},
    ).fetchall()

    return [
        {
            "id": str(row[0]),
            "image_processed_url": row[1],
            "image_thumbnail_url": row[2],
            "predicted_class": row[3],
            "created_at": row[4].isoformat() if row[4] else None,
        }
        for row in rows
    ]


def clear_prediction_image_urls(
    db: Session,
    record_id: str,
) -> Optional[str]:
    """
    Mengosongkan URL gambar setelah file dibersihkan dari Storage.

    Record klasifikasi tetap dipertahankan untuk kebutuhan riwayat/laporan.
    """
    try:
        row = db.execute(
            text(
                """
                UPDATE public.prediction_records
                SET
                    image_original_url = NULL,
                    image_processed_url = NULL,
                    image_thumbnail_url = NULL,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :record_id
                RETURNING id
                """
            ),
            {"record_id": record_id},
        ).fetchone()

        db.commit()

    except Exception:
        db.rollback()
        raise

    return str(row[0]) if row else None
