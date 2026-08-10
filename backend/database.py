"""
Koneksi SQLAlchemy ke PostgreSQL Supabase SawitVision V3.
"""

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL tidak ditemukan. Periksa file .env backend V3."
    )

# Session pooler Supabase cocok untuk backend FastAPI yang berjalan terus.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=int(os.getenv("DB_POOL_SIZE", "5")),
    max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "5")),
    pool_timeout=30,
    connect_args={
        "sslmode": os.getenv("DB_SSLMODE", "require"),
        "connect_timeout": 15,
    },
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
    bind=engine,
)


def get_db():
    """Dependency FastAPI untuk membuka dan menutup sesi database."""
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
