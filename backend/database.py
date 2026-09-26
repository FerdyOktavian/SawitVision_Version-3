"""
Koneksi SQLAlchemy ke PostgreSQL Supabase SawitVision V3.
"""

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config_utils import env_choice, env_int, env_text

load_dotenv()

DATABASE_URL = str(env_text("DATABASE_URL", required=True))

# Session pooler Supabase cocok untuk backend FastAPI yang berjalan terus.
engine = create_engine(
    DATABASE_URL,
    hide_parameters=True,
    pool_pre_ping=True,
    pool_recycle=300,
    pool_size=env_int("DB_POOL_SIZE", 5, minimum=1, maximum=50),
    max_overflow=env_int("DB_MAX_OVERFLOW", 5, minimum=0, maximum=100),
    pool_timeout=30,
    connect_args={
        "sslmode": env_choice(
            "DB_SSLMODE",
            "require",
            {"disable", "allow", "prefer", "require", "verify-ca", "verify-full"},
        ),
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
