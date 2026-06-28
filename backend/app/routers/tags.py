"""
routers/tags.py
-----------------
Just one endpoint: list all tags that exist, so the frontend can populate
the "filter by tag" dropdown on the Meetings Library page.

Tags themselves are created on-the-fly whenever a meeting is created/edited
with a new tag name (see _get_or_create_tag in meetings.py) -- there's no
separate "create tag" endpoint because tags have no meaning on their own,
only as labels attached to meetings.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=List[schemas.TagOut])
def list_tags(db: Session = Depends(get_db)):
    return db.query(models.Tag).order_by(models.Tag.name).all()
