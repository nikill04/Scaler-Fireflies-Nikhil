"""
routers/meetings.py
---------------------
All endpoints related to the Meetings Library and the Meeting Detail page:

  GET    /meetings                -> library list (with search/filter/sort)
  GET    /meetings/{id}           -> full detail view for one meeting
  POST   /meetings                -> create a meeting (form OR pasted transcript)
  PATCH  /meetings/{id}           -> edit title / participants / tags
  DELETE /meetings/{id}           -> delete a meeting (cascades to children)
  GET    /tags                    -> list all tags, for the filter dropdown

Each route is kept deliberately thin: validate input via the Pydantic
schema (FastAPI does this automatically from the type hint), do one clear
unit of DB work, return a schema. No business logic is hidden anywhere else.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import Optional, List
from datetime import datetime

from app.database import get_db
from app import models, schemas
from app.transcript_parser import parse_transcript_text

router = APIRouter(prefix="/meetings", tags=["meetings"])


def _get_or_create_tag(db: Session, name: str) -> models.Tag:
    """Helper: tags are reused across meetings, so look up by name first."""
    existing = db.query(models.Tag).filter(models.Tag.name == name).first()
    if existing:
        return existing
    tag = models.Tag(name=name)
    db.add(tag)
    db.commit()
    db.refresh(tag)
    return tag


def _meeting_query_with_relations(db: Session):
    """
    Shared query builder that eagerly loads all relationships we need.
    `joinedload` tells SQLAlchemy to fetch related rows in the same query
    (via SQL JOINs) instead of firing a separate query per relationship
    per meeting -- this avoids the classic "N+1 query" performance problem.
    """
    return db.query(models.Meeting).options(
        joinedload(models.Meeting.participants),
        joinedload(models.Meeting.meeting_tags).joinedload(models.MeetingTag.tag),
        joinedload(models.Meeting.host),
        joinedload(models.Meeting.transcript_lines),
        joinedload(models.Meeting.summary).joinedload(models.Summary.key_points),
        joinedload(models.Meeting.action_items),
        joinedload(models.Meeting.outline_items),
    )


# ---------------------------------------------------------------------------
# GET /meetings  -- Library / Dashboard list, with search + filter + sort
# ---------------------------------------------------------------------------
@router.get("", response_model=List[schemas.MeetingListItemOut])
def list_meetings(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search by meeting title"),
    participant: Optional[str] = Query(None, description="Filter by participant name"),
    tag: Optional[str] = Query(None, description="Filter by tag name"),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    sort: str = Query("recent", description="'recent' or 'oldest'"),
):
    query = db.query(models.Meeting).options(
        joinedload(models.Meeting.participants),
        joinedload(models.Meeting.meeting_tags).joinedload(models.MeetingTag.tag),
    )

    if q:
        query = query.filter(models.Meeting.title.ilike(f"%{q}%"))

    if participant:
        query = query.join(models.Participant).filter(
            models.Participant.name.ilike(f"%{participant}%")
        )

    if tag:
        query = query.join(models.MeetingTag).join(models.Tag).filter(
            models.Tag.name == tag
        )

    if date_from:
        query = query.filter(models.Meeting.date >= date_from)
    if date_to:
        query = query.filter(models.Meeting.date <= date_to)

    if sort == "oldest":
        query = query.order_by(models.Meeting.date.asc())
    else:
        query = query.order_by(models.Meeting.date.desc())

    # .distinct() guards against duplicate rows when we JOIN on participants/tags
    # (a meeting with 3 participants would otherwise appear 3 times).
    return query.distinct().all()


# ---------------------------------------------------------------------------
# GET /meetings/{id} -- full detail view
# ---------------------------------------------------------------------------
@router.get("/{meeting_id}", response_model=schemas.MeetingDetailOut)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = _meeting_query_with_relations(db).filter(
        models.Meeting.id == meeting_id
    ).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


# ---------------------------------------------------------------------------
# POST /meetings -- create (via form fields, optionally with pasted transcript)
# ---------------------------------------------------------------------------
@router.post("", response_model=schemas.MeetingDetailOut, status_code=201)
def create_meeting(payload: schemas.MeetingCreate, db: Session = Depends(get_db)):
    # Assume the single seeded default user is always the host (mocked auth).
    default_user = db.query(models.User).first()
    if not default_user:
        raise HTTPException(status_code=500, detail="No default user found. Did you run the seed script?")

    meeting = models.Meeting(
        host_id=default_user.id,
        title=payload.title,
        duration_seconds=payload.duration_seconds,
        media_url=payload.media_url,
        status="completed",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    for name in payload.participant_names:
        db.add(models.Participant(meeting_id=meeting.id, name=name))

    for tag_name in payload.tag_names:
        tag = _get_or_create_tag(db, tag_name)
        db.add(models.MeetingTag(meeting_id=meeting.id, tag_id=tag.id))

    # If a raw transcript was provided, parse it into TranscriptLine rows.
    if payload.raw_transcript:
        parsed_lines = parse_transcript_text(payload.raw_transcript)
        for speaker, start, end, text in parsed_lines:
            db.add(models.TranscriptLine(
                meeting_id=meeting.id,
                speaker_name=speaker,
                start_time=start,
                end_time=end,
                text=text,
            ))
        # Auto-set duration from the transcript if the user didn't specify one.
        if parsed_lines and payload.duration_seconds == 0:
            meeting.duration_seconds = int(parsed_lines[-1][2])

    # Every meeting gets a placeholder summary so the detail page never
    # shows a broken/empty summary panel -- it nudges the user toward
    # the "Generate AI Summary" action instead.
    db.add(models.Summary(
        meeting_id=meeting.id,
        overview="No summary yet. Click \"Generate AI Summary\" to create one from the transcript.",
    ))

    db.commit()
    db.refresh(meeting)
    return _meeting_query_with_relations(db).filter(models.Meeting.id == meeting.id).first()


# ---------------------------------------------------------------------------
# PATCH /meetings/{id} -- edit metadata
# ---------------------------------------------------------------------------
@router.patch("/{meeting_id}", response_model=schemas.MeetingDetailOut)
def update_meeting(meeting_id: int, payload: schemas.MeetingUpdate, db: Session = Depends(get_db)):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    if payload.title is not None:
        meeting.title = payload.title

    if payload.participant_names is not None:
        # Simplest correct approach: wipe and re-create participants.
        db.query(models.Participant).filter(models.Participant.meeting_id == meeting_id).delete()
        for name in payload.participant_names:
            db.add(models.Participant(meeting_id=meeting_id, name=name))

    if payload.tag_names is not None:
        db.query(models.MeetingTag).filter(models.MeetingTag.meeting_id == meeting_id).delete()
        for tag_name in payload.tag_names:
            tag = _get_or_create_tag(db, tag_name)
            db.add(models.MeetingTag(meeting_id=meeting_id, tag_id=tag.id))

    db.commit()
    return _meeting_query_with_relations(db).filter(models.Meeting.id == meeting_id).first()


# ---------------------------------------------------------------------------
# DELETE /meetings/{id}
# ---------------------------------------------------------------------------
@router.delete("/{meeting_id}", status_code=204)
def delete_meeting(meeting_id: int, db: Session = Depends(get_db)):
    meeting = db.query(models.Meeting).filter(models.Meeting.id == meeting_id).first()
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    db.delete(meeting)  # cascade="all, delete-orphan" handles all children
    db.commit()
    return None
