"""
Tes koneksi dan struktur tabel Supabase SawitVision V3.
"""

from sqlalchemy import text

from database import engine

REQUIRED_TABLES = {
    "users",
    "model_versions",
    "prediction_records",
    "activity_logs",
}


def main():
    with engine.connect() as connection:
        version = connection.execute(
            text("SELECT version();")
        ).scalar()

        rows = connection.execute(
            text(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name
                """
            )
        ).fetchall()

        available_tables = {row[0] for row in rows}
        missing_tables = REQUIRED_TABLES - available_tables

        user_count = connection.execute(
            text("SELECT COUNT(*) FROM public.users")
        ).scalar()

        print("Koneksi Supabase berhasil!")
        print("PostgreSQL:", version)
        print("Jumlah pengguna:", int(user_count or 0))
        print("Tabel public:", ", ".join(sorted(available_tables)))

        if missing_tables:
            print(
                "Tabel yang belum ada:",
                ", ".join(sorted(missing_tables)),
            )
            print(
                "Jalankan file schema_v3.sql di Supabase SQL Editor."
            )
        else:
            print("Semua tabel utama SawitVision V3 sudah tersedia.")


if __name__ == "__main__":
    main()
