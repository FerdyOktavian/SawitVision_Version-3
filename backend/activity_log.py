"""
Pencatatan aktivitas SawitVision V3.

File ini tidak menyimpan email, password, token, atau data verifikasi.
Log hanya berisi informasi aktivitas yang diperlukan untuk audit sistem.

Activity log dibatasi maksimal 500 data terbaru.
Jika jumlah log melebihi 500, log paling lama akan dihapus otomatis.
"""

import json
from typing import Any, Optional

from fastapi import Request
from sqlalchemy import text
from sqlalchemy.orm import Session


MAX_ACTIVITY_LOGS = 500


def get_client_ip(request: Optional[Request]) -> Optional[str]:
    """Mengambil alamat IP client, termasuk saat backend berada di proxy."""
    if request is None:
        return None

    forwarded_for = request.headers.get("x-forwarded-for")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()[:45]

    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()[:45]

    if request.client:
        return request.client.host[:45]

    return None


def get_user_agent(request: Optional[Request]) -> Optional[str]:
    """Mengambil informasi browser/perangkat pengguna."""
    if request is None:
        return None

    user_agent = request.headers.get("user-agent")
    return user_agent[:500] if user_agent else None


def trim_activity_logs(
    db: Session,
    max_logs: int = MAX_ACTIVITY_LOGS,
) -> int:
    """
    Menyisakan hanya activity log terbaru sesuai batas max_logs.

    Cleanup dijalankan di SAVEPOINT agar jika proses penghapusan gagal,
    transaksi utama seperti login/prediksi tetap tidak ikut gagal.
    """
    if max_logs <= 0:
        return 0

    try:
        with db.begin_nested():
            result = db.execute(
                text(
                    """
                    DELETE FROM public.activity_logs
                    WHERE ctid IN (
                        SELECT ctid
                        FROM public.activity_logs
                        ORDER BY
                            created_at DESC NULLS LAST,
                            ctid DESC
                        OFFSET :max_logs
                    )
                    """
                ),
                {
                    "max_logs": max_logs,
                },
            )

            deleted_count = result.rowcount or 0

        if deleted_count > 0:
            print(
                f"Activity log cleanup: "
                f"{deleted_count} log lama dihapus. "
                f"Maksimal tersimpan {max_logs} log."
            )

        return deleted_count

    except Exception as error:
        print(
            "Gagal membersihkan activity log lama: "
            f"{error}"
        )
        return 0


def log_activity(
    db: Session,
    action: str,
    description: str,
    *,
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    actor_user_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
    commit: bool = True,
) -> bool:
    """
    Menyimpan activity log lalu menjaga jumlahnya maksimal 500.

    Fungsi sengaja tidak melempar error ke fitur utama. Jika pencatatan
    atau cleanup log gagal, proses login, prediksi, penghapusan riwayat,
    dan fitur utama lainnya tetap dapat berjalan.
    """
    try:
        db.execute(
            text(
                """
                INSERT INTO public.activity_logs (
                    user_id,
                    actor_user_id,
                    action,
                    description,
                    ip_address,
                    user_agent,
                    metadata
                )
                VALUES (
                    :user_id,
                    :actor_user_id,
                    :action,
                    :description,
                    :ip_address,
                    :user_agent,
                    CAST(:metadata AS JSONB)
                )
                """
            ),
            {
                "user_id": user_id,
                "actor_user_id": actor_user_id,
                "action": (action or "UNKNOWN").strip().upper()[:100],
                "description": (description or "-").strip()[:2000],
                "ip_address": get_client_ip(request),
                "user_agent": get_user_agent(request),
                "metadata": json.dumps(
                    metadata or {},
                    ensure_ascii=False,
                    default=str,
                ),
            },
        )

        # Setelah log baru masuk, hapus log terlama jika total > 500.
        # Cleanup memakai SAVEPOINT sehingga kegagalan cleanup tidak
        # membatalkan INSERT log atau transaksi utama.
        trim_activity_logs(
            db,
            max_logs=MAX_ACTIVITY_LOGS,
        )

        if commit:
            db.commit()

        return True

    except Exception as error:
        db.rollback()
        print(
            f"Gagal menyimpan activity log "
            f"[{action}]: {error}"
        )
        return False