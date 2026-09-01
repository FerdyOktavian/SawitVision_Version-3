import re

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from activity_log import log_activity
from auth import create_access_token, get_current_user
from database import get_db
from storage_supabase import (
    delete_storage_paths_from_supabase,
    extract_supabase_storage_path,
)


router = APIRouter(prefix="/auth", tags=["Authentication"])


# =========================================================
# MODEL DATA DARI FRONTEND
# =========================================================
class RegisterRequest(BaseModel):
    """
    Data yang dibutuhkan saat membuat akun baru.

    Tidak ada email, password, maupun verifikasi email.
    """

    name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=8, max_length=25)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        # Menghapus spasi berlebih, misalnya "Budi   Santoso"
        cleaned = " ".join(value.strip().split())

        if len(cleaned) < 2:
            raise ValueError("Nama minimal terdiri dari 2 karakter.")

        return cleaned

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)


class LoginRequest(BaseModel):
    """
    Login V3 memakai kombinasi nama dan nomor telepon.
    """

    name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=8, max_length=25)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)


class UpdateProfileRequest(BaseModel):
    """
    Data yang boleh diperbarui oleh pengguna.
    """

    name: str = Field(..., min_length=2, max_length=100)
    phone_number: str = Field(..., min_length=8, max_length=25)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        return " ".join(value.strip().split())

    @field_validator("phone_number")
    @classmethod
    def validate_phone_number(cls, value: str) -> str:
        return normalize_phone_number(value)


# =========================================================
# HELPER
# =========================================================
def normalize_phone_number(phone_number: str) -> str:
    """
    Menyamakan format nomor telepon sebelum disimpan atau dicari.

    Contoh:
    +62 812-3456-7890 -> 081234567890
    6281234567890     -> 081234567890
    0812 3456 7890   -> 081234567890
    """
    digits = re.sub(r"\D", "", phone_number or "")

    if digits.startswith("62"):
        digits = "0" + digits[2:]
    elif digits.startswith("8"):
        digits = "0" + digits

    if not digits.startswith("0"):
        raise ValueError("Nomor telepon harus diawali 0 atau +62.")

    if len(digits) < 9 or len(digits) > 15:
        raise ValueError("Nomor telepon harus terdiri dari 9 sampai 15 digit.")

    return digits


def get_user_by_phone(db: Session, phone_number: str):
    """
    Mencari user berdasarkan nomor telepon yang sudah dinormalisasi.
    """
    row = db.execute(
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
            WHERE phone_number = :phone_number
            LIMIT 1
            """
        ),
        {"phone_number": phone_number},
    ).mappings().first()

    if not row:
        return None

    return {
        "id": str(row["id"]),
        "name": row["full_name"],
        "phone_number": row["phone_number"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": (
            row["created_at"].isoformat()
            if row["created_at"]
            else None
        ),
    }


def activity_logs_table_exists(db: Session) -> bool:
    """
    Mengecek tabel activity_logs agar proses daftar/login tetap bisa
    berjalan walaupun tabel log belum dibuat.
    """
    return bool(
        db.execute(
            text(
                """
                SELECT EXISTS (
                    SELECT 1
                    FROM information_schema.tables
                    WHERE table_schema = 'public'
                      AND table_name = 'activity_logs'
                )
                """
            )
        ).scalar()
    )


def safe_log_activity(
    db: Session,
    action: str,
    description: str,
    request: Request,
    user_id: str | None = None,
    actor_user_id: str | None = None,
    metadata: dict | None = None,
):
    """
    Menulis activity log hanya jika tabel activity_logs sudah tersedia.

    Kegagalan log tidak boleh menggagalkan proses login atau registrasi.
    """
    try:
        if activity_logs_table_exists(db):
            log_activity(
                db,
                action,
                description,
                request=request,
                user_id=user_id,
                actor_user_id=actor_user_id,
                metadata=metadata,
            )
    except Exception:
        db.rollback()


# =========================================================
# REGISTRASI
# =========================================================
@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
    payload: RegisterRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Membuat akun baru menggunakan nama dan nomor telepon.

    Nomor telepon wajib unik. Nama boleh sama dengan pengguna lain.
    """
    existing_user = get_user_by_phone(db, payload.phone_number)

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nomor telepon sudah terdaftar.",
        )

    try:
        row = db.execute(
            text(
                """
                INSERT INTO public.users (
                    full_name,
                    phone_number,
                    role,
                    is_active
                )
                VALUES (
                    :full_name,
                    :phone_number,
                    'user',
                    TRUE
                )
                RETURNING
                    id,
                    full_name,
                    phone_number,
                    role,
                    is_active,
                    created_at
                """
            ),
            {
                "full_name": payload.name,
                "phone_number": payload.phone_number,
            },
        ).mappings().first()

        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nomor telepon sudah terdaftar.",
        ) from exc

    user = {
        "id": str(row["id"]),
        "name": row["full_name"],
        "phone_number": row["phone_number"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": (
            row["created_at"].isoformat()
            if row["created_at"]
            else None
        ),
    }

    safe_log_activity(
        db,
        "REGISTER",
        "Akun pengguna berhasil dibuat.",
        request=request,
        user_id=user["id"],
        actor_user_id=user["id"],
        metadata={"phone_number": user["phone_number"]},
    )

    return {
        "message": "Registrasi berhasil. Silakan masuk.",
        "user": user,
    }


# =========================================================
# LOGIN
# =========================================================
@router.post("/login")
def login_user(
    payload: LoginRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Login berhasil hanya jika nama dan nomor telepon cocok.

    Nomor telepon menjadi identitas unik akun, sedangkan nama digunakan
    sebagai pemeriksaan tambahan sesuai rancangan SawitVision V3.
    """
    user = get_user_by_phone(db, payload.phone_number)

    name_matches = (
        user is not None
        and user["name"].strip().casefold() == payload.name.strip().casefold()
    )

    if not user or not name_matches:
        safe_log_activity(
            db,
            "LOGIN_FAILED",
            "Percobaan login gagal karena data tidak cocok.",
            request=request,
            user_id=user["id"] if user else None,
            actor_user_id=user["id"] if user else None,
            metadata={
                "phone_number": payload.phone_number,
                "reason": "name_or_phone_mismatch",
            },
        )

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nama atau nomor telepon tidak sesuai.",
        )

    if not user["is_active"]:
        safe_log_activity(
            db,
            "LOGIN_FAILED",
            "Login ditolak karena akun tidak aktif.",
            request=request,
            user_id=user["id"],
            actor_user_id=user["id"],
            metadata={"reason": "inactive_account"},
        )

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akun tidak aktif. Hubungi admin.",
        )

    access_token = create_access_token(
        {
            "sub": user["id"],
            "phone_number": user["phone_number"],
            "role": user["role"],
        }
    )

    safe_log_activity(
        db,
        "LOGIN",
        "Pengguna berhasil login.",
        request=request,
        user_id=user["id"],
        actor_user_id=user["id"],
    )

    return {
        "message": "Login berhasil.",
        "access_token": access_token,
        "token_type": "bearer",
        "user": user,
    }


# =========================================================
# PROFIL
# =========================================================
@router.get("/me")
def get_my_profile(
    current_user: dict = Depends(get_current_user),
):
    """
    Mengambil profil berdasarkan JWT pengguna yang sedang login.
    """
    return {"user": current_user}


@router.patch("/profile")
def update_profile(
    payload: UpdateProfileRequest,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Memperbarui nama dan nomor telepon pengguna.

    Nomor baru tidak boleh dipakai oleh akun lain.
    """
    existing_user = get_user_by_phone(db, payload.phone_number)

    if existing_user and existing_user["id"] != current_user["id"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nomor telepon sudah digunakan akun lain.",
        )

    try:
        row = db.execute(
            text(
                """
                UPDATE public.users
                SET
                    full_name = :full_name,
                    phone_number = :phone_number,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = :user_id
                RETURNING
                    id,
                    full_name,
                    phone_number,
                    role,
                    is_active,
                    created_at
                """
            ),
            {
                "full_name": payload.name,
                "phone_number": payload.phone_number,
                "user_id": current_user["id"],
            },
        ).mappings().first()

        db.commit()

    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Nomor telepon sudah digunakan akun lain.",
        ) from exc

    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Pengguna tidak ditemukan.",
        )

    updated_user = {
        "id": str(row["id"]),
        "name": row["full_name"],
        "phone_number": row["phone_number"],
        "role": row["role"],
        "is_active": bool(row["is_active"]),
        "created_at": (
            row["created_at"].isoformat()
            if row["created_at"]
            else None
        ),
    }

    safe_log_activity(
        db,
        "UPDATE_PROFILE",
        "Pengguna memperbarui profil.",
        request=request,
        user_id=current_user["id"],
        actor_user_id=current_user["id"],
        metadata={
            "old_phone_number": current_user["phone_number"],
            "new_phone_number": updated_user["phone_number"],
        },
    )

    return {
        "message": "Profil berhasil diperbarui.",
        "user": updated_user,
    }

# =========================================================
# HAPUS AKUN SENDIRI
# =========================================================
@router.delete("/account")
def delete_my_account(
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Menghapus akun pengguna yang sedang login secara permanen.

    Yang dihapus:
    - gambar prediksi milik pengguna dari Supabase Storage,
    - seluruh prediction_records milik pengguna,
    - seluruh activity_logs yang terkait pengguna,
    - akun pada tabel users.

    User ID tidak diterima dari frontend. Identitas akun selalu diambil
    dari JWT current_user sehingga pengguna tidak dapat menghapus akun lain.
    """
    user_id = current_user["id"]

    # Untuk keamanan, administrator tidak dapat menghapus akun admin sendiri
    # melalui endpoint pengguna biasa.
    if current_user.get("role") == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Akun administrator tidak dapat dihapus dari halaman profil. "
                "Ubah peran akun terlebih dahulu jika memang ingin menghapusnya."
            ),
        )

    try:
        # Ambil URL seluruh gambar terlebih dahulu sebelum record DB dihapus.
        image_rows = db.execute(
            text(
                """
                SELECT
                    image_original_url,
                    image_processed_url,
                    image_thumbnail_url
                FROM public.prediction_records
                WHERE user_id = :user_id
                """
            ),
            {"user_id": user_id},
        ).fetchall()

        storage_paths = []

        for row in image_rows:
            for file_url in row:
                path = extract_supabase_storage_path(file_url)
                if path:
                    storage_paths.append(path)

        # Hapus storage lebih dulu. Kalau gagal, akun tidak dihapus agar tidak
        # meninggalkan object gambar yang tidak lagi bisa dilacak dari database.
        if storage_paths:
            unique_paths = list(dict.fromkeys(storage_paths))

            # Supabase Storage lebih aman dihapus per batch kecil.
            for index in range(0, len(unique_paths), 100):
                delete_storage_paths_from_supabase(
                    unique_paths[index:index + 100]
                )

        # Hapus seluruh data milik user dalam satu transaksi database.
        with db.begin_nested():
            if activity_logs_table_exists(db):
                db.execute(
                    text(
                        """
                        DELETE FROM public.activity_logs
                        WHERE user_id = :user_id
                           OR actor_user_id = :user_id
                        """
                    ),
                    {"user_id": user_id},
                )

            db.execute(
                text(
                    """
                    DELETE FROM public.prediction_records
                    WHERE user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            )

            deleted_user = db.execute(
                text(
                    """
                    DELETE FROM public.users
                    WHERE id = :user_id
                    RETURNING id
                    """
                ),
                {"user_id": user_id},
            ).fetchone()

            if not deleted_user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Akun pengguna tidak ditemukan.",
                )

        db.commit()

        return {
            "message": "Akun dan seluruh data pengguna berhasil dihapus permanen."
        }

    except HTTPException:
        db.rollback()
        raise

    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "Gagal menghapus akun secara permanen. "
                "Tidak ada perubahan database yang disimpan."
            ),
        ) from exc

class FindAccountRequest(BaseModel):
    phone: str = Field(..., min_length=8, max_length=20)
@router.post("/find-account")
def find_account(
    payload: FindAccountRequest,
    db: Session = Depends(get_db),
):
    phone = payload.phone.strip()

    row = db.execute(
        text("""
            SELECT id, full_name, phone_number
            FROM users
            WHERE phone_number = :phone
            LIMIT 1
        """),
        {"phone": phone},
    ).fetchone()

    if not row:
        return {
            "found": False,
            "message": "Nomor telepon belum terdaftar.",
        }

    return {
        "found": True,
        "name": row[1],
        "phone": row[2],
    }