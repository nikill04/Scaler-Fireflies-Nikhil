"""
database.py
------------
This file sets up the connection to our SQLite database.

Think of this like the single "plug point" for the whole backend:
- `engine`        -> the actual connection to the .db file on disk
- `SessionLocal`  -> a factory that hands out a fresh DB "conversation" (session)
                     per request
- `Base`          -> the parent class every model (table) in models.py inherits from
- `get_db()`      -> a FastAPI dependency that opens a session, gives it to your
                     route function, and closes it afterwards (even if it crashes)

You will rarely touch this file again after setup -- it just wires things together.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite file will be created at backend/fireflies.db
# check_same_thread=False is required for SQLite + FastAPI because FastAPI can
# handle a request in a different thread than the one that created the connection.
SQLALCHEMY_DATABASE_URL = "sqlite:///./fireflies.db"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
)

# Each instance of SessionLocal is one "conversation" with the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# All ORM models (tables) will inherit from this Base class.
Base = declarative_base()


def get_db():
    """
    FastAPI dependency.
    Usage in a route:  db: Session = Depends(get_db)

    `yield` instead of `return` means: give the session to the route,
    let the route do its DB work, and once the route finishes (success
    or error) come back here and close the session in the `finally` block.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
