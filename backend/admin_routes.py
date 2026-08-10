from typing import Optional
import os

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from activity_log import log_activity
from auth import get_current_admin
from database import get_db
from crud import get_oldest_prediction_images, clear_prediction_image_urls
from storage_supabase import delete_prediction_images_from_supabase


# Semua endpoint pada file ini otomatis memiliki prefix /admin.
router = APIRouter(prefix="/admin", tags=["Admin"])


# =========================================================
# HELPER
# =========================================================
def table_exists(db: Session, table_name: str) -> bool:
    """
    Mengecek apakah sebuah tabel sudah tersedia di database.

    Helper ini berguna selama proses pembangunan V3. Misalnya tabel users
    sudah ada, tetapi prediction_records atau activity_logs belum dibuat.
    Dengan begitu endpoint statistik tetap dapat dibuka tanpa langsung error.
    """
    result = db.execute(
        text(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_name = :table_name
            )
            """
        ),
        {"table_name": table_name},
    ).scalar()

    return bool(result)


# =========================================================
# STATISTIK ADMIN
# =========================================================
@router.get("/stats")
def get_admin_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Mengambil ringkasan data untuk dashboard admin.

    Versi V3 tidak lagi menghitung akun terverifikasi karena sistem email
    dan verifikasi email sudah dihapus.
    """
    total_users = db.execute(
        text("SELECT COUNT(*) FROM public.users")
    ).scalar()

    active_users = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM public.users
            WHERE is_active = TRUE
            """
        )
    ).scalar()

    admin_users = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM public.users
            WHERE role = 'admin'
            """
        )
    ).scalar()

    regular_users = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM public.users
            WHERE role = 'user'
            """
        )
    ).scalar()

    # Nilai default selama tabel prediksi dan log belum dibuat.
    total_predictions = 0
    total_logs = 0
    predictions_by_class = {}
    recent_predictions = []

    if table_exists(db, "prediction_records"):
        total_predictions = int(
            db.execute(
                text("SELECT COUNT(*) FROM public.prediction_records")
            ).scalar()
            or 0
        )

        prediction_rows = db.execute(
            text(
                """
                SELECT
                    predicted_class,
                    COUNT(*) AS total,
                    AVG(confidence) AS avg_confidence
                FROM public.prediction_records
                GROUP BY predicted_class
                ORDER BY total DESC
                """
            )
        ).fetchall()

        predictions_by_class = {
            row[0]: {
                "total": int(row[1]),
                "avg_confidence": (
                    round(float(row[2]), 2)
                    if row[2] is not None
                    else 0
                ),
            }
            for row in prediction_rows
        }

        rows = db.execute(
            text(
                """
                SELECT
                    pr.id,
                    pr.predicted_class,
                    pr.confidence,
                    pr.created_at,
                    u.full_name,
                    u.phone_number
                FROM public.prediction_records pr
                LEFT JOIN public.users u
                    ON pr.user_id = u.id
                ORDER BY pr.created_at DESC
                LIMIT 10
                """
            )
        ).fetchall()

        recent_predictions = [
            {
                "id": str(row[0]),
                "predicted_class": row[1],
                "confidence": float(row[2] or 0),
                "created_at": (
                    row[3].isoformat()
                    if row[3]
                    else None
                ),
                "user_name": row[4] or "Tidak diketahui",
                "user_phone": row[5] or "-",
            }
            for row in rows
        ]

    if table_exists(db, "activity_logs"):
        total_logs = int(
            db.execute(
                text("SELECT COUNT(*) FROM public.activity_logs")
            ).scalar()
            or 0
        )

    return {
        "admin": {
            "id": current_admin["id"],
            "name": current_admin["name"],
            "phone_number": current_admin["phone_number"],
            "role": current_admin["role"],
        },
        "users": {
            "total": int(total_users or 0),
            "active": int(active_users or 0),
            "admin": int(admin_users or 0),
            "regular": int(regular_users or 0),
        },
        "predictions": {
            "total": total_predictions,
            "by_class": predictions_by_class,
            "recent": recent_predictions,
        },
        "activity_logs": {
            "total": total_logs,
        },
    }


# =========================================================
# DAFTAR PENGGUNA
# =========================================================
@router.get("/users")
def get_admin_users(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None, max_length=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Mengambil daftar pengguna.

    Pencarian V3 dilakukan berdasarkan nama atau nomor telepon.
    """
    search_value = (
        f"%{search.strip()}%"
        if search and search.strip()
        else None
    )

    filter_sql = """
        WHERE (
            :search IS NULL
            OR u.full_name ILIKE :search
            OR u.phone_number ILIKE :search
        )
    """

    params = {
        "search": search_value,
        "limit": limit,
        "offset": offset,
    }

    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM public.users u
            {filter_sql}
            """
        ),
        {"search": search_value},
    ).scalar()

    has_prediction_table = table_exists(db, "prediction_records")

    if has_prediction_table:
        query = f"""
            SELECT
                u.id,
                u.full_name,
                u.phone_number,
                u.role,
                u.is_active,
                u.created_at,
                COUNT(pr.id) AS total_predictions
            FROM public.users u
            LEFT JOIN public.prediction_records pr
                ON pr.user_id = u.id
            {filter_sql}
            GROUP BY
                u.id,
                u.full_name,
                u.phone_number,
                u.role,
                u.is_active,
                u.created_at
            ORDER BY u.created_at DESC
            LIMIT :limit OFFSET :offset
        """
    else:
        query = f"""
            SELECT
                u.id,
                u.full_name,
                u.phone_number,
                u.role,
                u.is_active,
                u.created_at,
                0 AS total_predictions
            FROM public.users u
            {filter_sql}
            ORDER BY u.created_at DESC
            LIMIT :limit OFFSET :offset
        """

    rows = db.execute(text(query), params).fetchall()
    total_value = int(total or 0)

    return {
        "total": total_value,
        "limit": limit,
        "offset": offset,
        "has_more": offset + limit < total_value,
        "data": [
            {
                "id": str(row[0]),
                "name": row[1],
                "phone_number": row[2],
                "role": row[3],
                "is_active": bool(row[4]),
                "created_at": (
                    row[5].isoformat()
                    if row[5]
                    else None
                ),
                "total_predictions": int(row[6] or 0),
            }
            for row in rows
        ],
    }


# =========================================================
# UBAH STATUS PENGGUNA
# =========================================================
@router.patch("/users/{user_id}/status")
def update_user_status(
    user_id: str,
    is_active: bool,
    request: Request,
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Mengaktifkan atau menonaktifkan akun user biasa.

    Admin tidak boleh menonaktifkan dirinya sendiri atau admin lain
    melalui endpoint ini.
    """
    if user_id == current_admin["id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin tidak boleh mengubah status akun sendiri.",
        )

    target = db.execute(
        text(
            """
            SELECT
                id,
                full_name,
                phone_number,
                role,
                is_active,
                created_at
            FROM public.users
            WHERE id = :user_id
            LIMIT 1
            """
        ),
        {"user_id": user_id},
    ).fetchone()

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User tidak ditemukan.",
        )

    if target[3] == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Status akun admin lain tidak dapat diubah.",
        )

    db.execute(
        text(
            """
            UPDATE public.users
            SET
                is_active = :is_active,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = :user_id
            """
        ),
        {
            "user_id": user_id,
            "is_active": is_active,
        },
    )
    db.commit()

    action = (
        "ADMIN_ACTIVATE_USER"
        if is_active
        else "ADMIN_DEACTIVATE_USER"
    )

    if table_exists(db, "activity_logs"):
        log_activity(
            db,
            action,
            (
                "Admin mengaktifkan akun pengguna."
                if is_active
                else "Admin menonaktifkan akun pengguna."
            ),
            request=request,
            user_id=user_id,
            actor_user_id=current_admin["id"],
            metadata={
                "target_phone_number": target[2],
                "new_is_active": is_active,
            },
        )

    return {
        "message": "Status user berhasil diperbarui.",
        "user": {
            "id": str(target[0]),
            "name": target[1],
            "phone_number": target[2],
            "role": target[3],
            "is_active": is_active,
            "created_at": (
                target[5].isoformat()
                if target[5]
                else None
            ),
        },
    }


# =========================================================
# ACTIVITY LOG
# =========================================================
@router.get("/activity-logs")
def get_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    action: Optional[str] = Query(None, max_length=100),
    search: Optional[str] = Query(None, max_length=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Mengambil catatan aktivitas sistem.

    Selama tabel activity_logs belum dibuat, endpoint mengembalikan data
    kosong agar proses pembangunan V3 tetap dapat dilanjutkan.
    """
    if not table_exists(db, "activity_logs"):
        return {
            "page": page,
            "page_size": page_size,
            "total": 0,
            "total_pages": 0,
            "has_more": False,
            "data": [],
        }

    offset = (page - 1) * page_size

    action_value = (
        action.strip().upper()
        if action and action.strip()
        else None
    )

    search_value = (
        f"%{search.strip()}%"
        if search and search.strip()
        else None
    )

    filters = """
        WHERE (:action IS NULL OR al.action = :action)
          AND (
              :search IS NULL
              OR al.description ILIKE :search
              OR target.full_name ILIKE :search
              OR target.phone_number ILIKE :search
              OR actor.full_name ILIKE :search
              OR actor.phone_number ILIKE :search
          )
    """

    params = {
        "action": action_value,
        "search": search_value,
        "limit": page_size,
        "offset": offset,
    }

    total = db.execute(
        text(
            f"""
            SELECT COUNT(*)
            FROM public.activity_logs al
            LEFT JOIN public.users target
                ON target.id = al.user_id
            LEFT JOIN public.users actor
                ON actor.id = al.actor_user_id
            {filters}
            """
        ),
        params,
    ).scalar()

    rows = db.execute(
        text(
            f"""
            SELECT
                al.id,
                al.action,
                al.description,
                al.ip_address,
                al.user_agent,
                al.metadata,
                al.created_at,
                target.id,
                target.full_name,
                target.phone_number,
                actor.id,
                actor.full_name,
                actor.phone_number
            FROM public.activity_logs al
            LEFT JOIN public.users target
                ON target.id = al.user_id
            LEFT JOIN public.users actor
                ON actor.id = al.actor_user_id
            {filters}
            ORDER BY al.created_at DESC
            LIMIT :limit OFFSET :offset
            """
        ),
        params,
    ).fetchall()

    total_value = int(total or 0)

    return {
        "page": page,
        "page_size": page_size,
        "total": total_value,
        "total_pages": (
            (total_value + page_size - 1) // page_size
            if total_value
            else 0
        ),
        "has_more": offset + page_size < total_value,
        "data": [
            {
                "id": int(row[0]),
                "action": row[1],
                "description": row[2],
                "ip_address": row[3],
                "user_agent": row[4],
                "metadata": row[5] or {},
                "created_at": (
                    row[6].isoformat()
                    if row[6]
                    else None
                ),
                "target_user": (
                    {
                        "id": str(row[7]),
                        "name": row[8],
                        "phone_number": row[9],
                    }
                    if row[7]
                    else None
                ),
                "actor_user": (
                    {
                        "id": str(row[10]),
                        "name": row[11],
                        "phone_number": row[12],
                    }
                    if row[10]
                    else None
                ),
            }
            for row in rows
        ],
    }


@router.delete("/activity-logs/cleanup")
def cleanup_activity_logs(
    request: Request,
    older_than_days: int = Query(90, ge=7, le=3650),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Menghapus activity log yang lebih lama dari jumlah hari tertentu.
    """
    if not table_exists(db, "activity_logs"):
        return {
            "message": "Tabel activity_logs belum tersedia.",
            "deleted_count": 0,
            "retention_days": older_than_days,
        }

    params = {"older_than_days": older_than_days}

    deleted_count = db.execute(
        text(
            """
            SELECT COUNT(*)
            FROM public.activity_logs
            WHERE created_at < (
                CURRENT_TIMESTAMP
                - (:older_than_days * INTERVAL '1 day')
            )
            """
        ),
        params,
    ).scalar()

    db.execute(
        text(
            """
            DELETE FROM public.activity_logs
            WHERE created_at < (
                CURRENT_TIMESTAMP
                - (:older_than_days * INTERVAL '1 day')
            )
            """
        ),
        params,
    )
    db.commit()

    deleted_value = int(deleted_count or 0)

    log_activity(
        db,
        "ADMIN_CLEANUP_ACTIVITY_LOGS",
        (
            f"Admin membersihkan {deleted_value} activity log "
            f"yang lebih lama dari {older_than_days} hari."
        ),
        request=request,
        user_id=current_admin["id"],
        actor_user_id=current_admin["id"],
        metadata={
            "older_than_days": older_than_days,
            "deleted_count": deleted_value,
        },
    )

    return {
        "message": (
            f"{deleted_value} activity log lama berhasil dihapus."
        ),
        "deleted_count": deleted_value,
        "retention_days": older_than_days,
    }


# =========================================================
# STATISTIK STORAGE
# =========================================================
@router.get("/storage-stats")
def get_storage_stats(
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Menghitung estimasi penggunaan storage gambar prediksi.

    Jika tabel prediction_records belum tersedia, endpoint mengembalikan
    penggunaan nol.
    """
    storage_limit_gb = float(
        os.getenv("APP_STORAGE_LIMIT_GB", "1")
    )
    storage_limit_bytes = int(
        storage_limit_gb * 1024 * 1024 * 1024
    )

    if not table_exists(db, "prediction_records"):
        return {
            "status": "safe",
            "message": "Tabel prediction_records belum tersedia.",
            "limit": {
                "bytes": storage_limit_bytes,
                "mb": round(storage_limit_bytes / (1024 * 1024), 2),
                "gb": storage_limit_gb,
            },
            "usage": {
                "estimated_bytes": 0,
                "estimated_mb": 0,
                "estimated_gb": 0,
                "percentage": 0,
            },
            "remaining": {
                "bytes": storage_limit_bytes,
                "mb": round(storage_limit_bytes / (1024 * 1024), 2),
                "gb": storage_limit_gb,
            },
            "files": {
                "prediction_records": 0,
                "processed_images": 0,
                "thumbnail_images": 0,
                "total_storage_objects": 0,
            },
        }

    row = db.execute(
        text(
            """
            SELECT
                COUNT(*) AS total_records,
                COUNT(image_processed_url) AS processed_images,
                COUNT(image_thumbnail_url) AS thumbnail_images,
                COALESCE(SUM(file_size_bytes), 0) AS total_file_bytes
            FROM public.prediction_records
            WHERE image_processed_url IS NOT NULL
               OR image_thumbnail_url IS NOT NULL
            """
        )
    ).fetchone()

    total_records = int(row[0] or 0)
    processed_images = int(row[1] or 0)
    thumbnail_images = int(row[2] or 0)
    original_file_bytes = int(row[3] or 0)

    # Estimasi ukuran file hasil kompresi.
    estimated_processed_bytes = int(
        original_file_bytes * 0.60
    )
    estimated_thumbnail_bytes = int(
        original_file_bytes * 0.10
    )

    estimated_storage_bytes = (
        estimated_processed_bytes
        + estimated_thumbnail_bytes
    )

    remaining_bytes = max(
        storage_limit_bytes - estimated_storage_bytes,
        0,
    )

    usage_percentage = (
        estimated_storage_bytes / storage_limit_bytes * 100
        if storage_limit_bytes > 0
        else 0
    )

    if usage_percentage >= 95:
        storage_status = "critical"
        storage_message = "Storage hampir mencapai batas."
    elif usage_percentage >= 80:
        storage_status = "warning"
        storage_message = "Storage mulai mendekati batas."
    else:
        storage_status = "safe"
        storage_message = "Penggunaan storage masih aman."

    def bytes_to_mb(value: int) -> float:
        return round(value / (1024 * 1024), 2)

    def bytes_to_gb(value: int) -> float:
        return round(value / (1024 * 1024 * 1024), 3)

    return {
        "status": storage_status,
        "message": storage_message,
        "limit": {
            "bytes": storage_limit_bytes,
            "mb": bytes_to_mb(storage_limit_bytes),
            "gb": storage_limit_gb,
        },
        "usage": {
            "estimated_bytes": estimated_storage_bytes,
            "estimated_mb": bytes_to_mb(
                estimated_storage_bytes
            ),
            "estimated_gb": bytes_to_gb(
                estimated_storage_bytes
            ),
            "percentage": round(usage_percentage, 2),
        },
        "remaining": {
            "bytes": remaining_bytes,
            "mb": bytes_to_mb(remaining_bytes),
            "gb": bytes_to_gb(remaining_bytes),
        },
        "files": {
            "prediction_records": total_records,
            "processed_images": processed_images,
            "thumbnail_images": thumbnail_images,
            "total_storage_objects": (
                processed_images + thumbnail_images
            ),
        },
        "calculation": {
            "source_upload_bytes": original_file_bytes,
            "processed_estimation_ratio": 0.60,
            "thumbnail_estimation_ratio": 0.10,
            "is_estimation": True,
        },
    }


# =========================================================
# BERSIHKAN GAMBAR LAMA
# =========================================================
@router.delete("/storage/cleanup")
def cleanup_old_storage_images(
    request: Request,
    limit: int = Query(10, ge=1, le=100),
    current_admin: dict = Depends(get_current_admin),
    db: Session = Depends(get_db),
):
    """
    Menghapus file gambar prediksi lama dari Supabase Storage tanpa
    menghapus record hasil prediksi dari database.
    """
    if not table_exists(db, "prediction_records"):
        return {
            "message": "Tabel prediction_records belum tersedia.",
            "requested_limit": limit,
            "candidate_records": 0,
            "cleaned_records": 0,
            "deleted_storage_objects": 0,
            "failed_records": [],
        }

    candidates = get_oldest_prediction_images(
        db=db,
        limit=limit,
    )

    if not candidates:
        return {
            "message": "Tidak ada gambar lama yang perlu dibersihkan.",
            "requested_limit": limit,
            "candidate_records": 0,
            "cleaned_records": 0,
            "deleted_storage_objects": 0,
            "failed_records": [],
        }

    cleaned_record_ids = []
    deleted_paths = []
    failed_records = []

    for item in candidates:
        try:
            storage_result = delete_prediction_images_from_supabase(
                image_processed_url=item.get(
                    "image_processed_url"
                ),
                image_thumbnail_url=item.get(
                    "image_thumbnail_url"
                ),
            )

            cleared_id = clear_prediction_image_urls(
                db=db,
                record_id=item["id"],
            )

            if not cleared_id:
                raise RuntimeError(
                    "Record gagal diperbarui setelah file dihapus."
                )

            cleaned_record_ids.append(cleared_id)
            deleted_paths.extend(
                storage_result.get("deleted_paths", [])
            )

        except Exception as error:
            db.rollback()
            failed_records.append(
                {
                    "record_id": item["id"],
                    "error": str(error),
                }
            )

    if table_exists(db, "activity_logs"):
        log_activity(
            db,
            "ADMIN_STORAGE_CLEANUP",
            "Admin membersihkan gambar prediksi lama.",
            request=request,
            user_id=current_admin["id"],
            actor_user_id=current_admin["id"],
            metadata={
                "requested_limit": limit,
                "candidate_records": len(candidates),
                "cleaned_records": len(cleaned_record_ids),
                "deleted_storage_objects": len(deleted_paths),
                "failed_records": len(failed_records),
                "cleaned_record_ids": cleaned_record_ids,
            },
        )

    return {
        "message": (
            f"Cleanup selesai. {len(cleaned_record_ids)} record "
            "gambar berhasil dibersihkan."
        ),
        "requested_limit": limit,
        "candidate_records": len(candidates),
        "cleaned_records": len(cleaned_record_ids),
        "deleted_storage_objects": len(deleted_paths),
        "cleaned_record_ids": cleaned_record_ids,
        "failed_records": failed_records,
    }