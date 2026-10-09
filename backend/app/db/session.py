import os
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

# Dynamically resolve the absolute path to the backend directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Convert backslashes to forward slashes for SQLAlchemy's SQLite URL format
DB_PATH = os.path.join(BASE_DIR, "library_demand.db").replace('\\', '/')
default_url = f"sqlite:///{DB_PATH}"

DATABASE_URL = os.getenv("DATABASE_URL", default_url)
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, pool_pre_ping=True, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
