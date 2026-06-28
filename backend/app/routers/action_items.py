"""
routers/action_items.py
-------------------------
CRUD for action items belonging to a meeting.

These routes are "nested" under /meetings/{meeting_id}/action-items because
an action item never exists independently of a meeting -- it always belongs
to exactly one (this mirrors the foreign key in the ActionItem model).

  POST   /meetings/{id}/action-items           -> add a new task
  PATCH  /meetings/{id}/action-items/{item_id}  -> edit text/assignee, or toggle complete
  DELETE /meetings/{id}/action-items/{item_id}  -> remove a task
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/meetings/{meeting_id}/action-items", tags=["action items"])


def _get_meeting_or_404(db: Session, meeting_id: int) -> models.Meeting:
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


@router.post("", response_model=schemas.ActionItemOut, status_code=201)
def create_action_item(meeting_id: int, payload: schemas.ActionItemCreate, db: Session = Depends(get_db)):
    _get_meeting_or_404(db, meeting_id)
    item = models.ActionItem(
        meeting_id=meeting_id,
        task=payload.task,
        assignee_name=payload.assignee_name,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=schemas.ActionItemOut)
def update_action_item(meeting_id: int, item_id: int, payload: schemas.ActionItemUpdate, db: Session = Depends(get_db)):
    item = db.query(models.ActionItem).filter(
        models.ActionItem.id == item_id,
        models.ActionItem.meeting_id == meeting_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")

    if payload.task is not None:
        item.task = payload.task
    if payload.assignee_name is not None:
        item.assignee_name = payload.assignee_name
    if payload.is_completed is not None:
        item.is_completed = payload.is_completed

    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=204)
def delete_action_item(meeting_id: int, item_id: int, db: Session = Depends(get_db)):
    item = db.query(models.ActionItem).filter(
        models.ActionItem.id == item_id,
        models.ActionItem.meeting_id == meeting_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="Action item not found")
    db.delete(item)
    db.commit()
    return None
