"""
schemas.py
-----------
SQLAlchemy models (models.py) describe the DATABASE TABLES.
Pydantic schemas (this file) describe the JSON shapes the API sends and
receives over HTTP. They are deliberately kept separate:

  Browser  <--JSON-->  Pydantic Schema  <-->  SQLAlchemy Model  <-->  SQLite

Why two layers instead of just returning the DB model directly?
- We don't always want to expose every DB column (e.g. internal IDs we don't
  need on the frontend, or fields that only make sense server-side).
- "Create" payloads look different from "Read" payloads (e.g. when creating
  a meeting you don't send an `id`, but when reading one back you get the id).
- Pydantic validates incoming data automatically (e.g. rejects a request
  missing a required field) before it ever touches our database code.

Naming convention used below:
  XCreate  -> shape of data the CLIENT sends to create something
  XUpdate  -> shape of data the CLIENT sends to update something (fields optional)
  XOut     -> shape of data the SERVER sends back (includes id, timestamps, etc.)
"""

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import datetime


# A base config so every "Out" schema can be built directly from a SQLAlchemy
# object (model_config = from_attributes=True), instead of having to manually
# convert it to a dict first.
class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# USER
# ---------------------------------------------------------------------------
class UserOut(ORMBase):
    id: int
    name: str
    email: str
    avatar_url: Optional[str] = None
    role: str


# ---------------------------------------------------------------------------
# PARTICIPANT
# ---------------------------------------------------------------------------
class ParticipantCreate(BaseModel):
    name: str
    avatar_url: Optional[str] = None


class ParticipantOut(ORMBase):
    id: int
    name: str
    avatar_url: Optional[str] = None


# ---------------------------------------------------------------------------
# TRANSCRIPT LINE
# ---------------------------------------------------------------------------
class TranscriptLineCreate(BaseModel):
    speaker_name: str
    start_time: float
    end_time: float
    text: str


class TranscriptLineOut(ORMBase):
    id: int
    speaker_name: str
    start_time: float
    end_time: float
    text: str


# ---------------------------------------------------------------------------
# SUMMARY + KEY POINTS
# ---------------------------------------------------------------------------
class SummaryKeyPointOut(ORMBase):
    id: int
    text: str
    order_index: int


class SummaryOut(ORMBase):
    id: int
    overview: str
    generated_at: datetime
    key_points: List[SummaryKeyPointOut] = []


class SummaryUpdate(BaseModel):
    overview: str
    key_points: List[str]  # client sends plain strings; we rebuild the rows


# ---------------------------------------------------------------------------
# ACTION ITEM
# ---------------------------------------------------------------------------
class ActionItemCreate(BaseModel):
    task: str
    assignee_name: Optional[str] = None


class ActionItemUpdate(BaseModel):
    task: Optional[str] = None
    assignee_name: Optional[str] = None
    is_completed: Optional[bool] = None


class ActionItemOut(ORMBase):
    id: int
    task: str
    assignee_name: Optional[str] = None
    is_completed: bool


# ---------------------------------------------------------------------------
# OUTLINE ITEM
# ---------------------------------------------------------------------------
class OutlineItemOut(ORMBase):
    id: int
    title: str
    start_time: float
    order_index: int


# ---------------------------------------------------------------------------
# TAG
# ---------------------------------------------------------------------------
class TagOut(ORMBase):
    id: int
    name: str


# ---------------------------------------------------------------------------
# MEETING
# ---------------------------------------------------------------------------
class MeetingCreate(BaseModel):
    title: str
    duration_seconds: int = 0
    media_url: Optional[str] = None
    participant_names: List[str] = []   # simple list of names from a form
    tag_names: List[str] = []
    # Optional raw transcript text the user pastes/uploads.
    # Expected format per line: "Speaker Name [00:12] Some text they said"
    raw_transcript: Optional[str] = None


class MeetingUpdate(BaseModel):
    title: Optional[str] = None
    participant_names: Optional[List[str]] = None
    tag_names: Optional[List[str]] = None


class MeetingTagOut(ORMBase):
    tag: TagOut


class MeetingListItemOut(ORMBase):
    """Lightweight shape used for the Meetings Library list view."""
    id: int
    title: str
    date: datetime
    duration_seconds: int
    status: str
    participants: List[ParticipantOut] = []
    meeting_tags: List[MeetingTagOut] = []


class MeetingDetailOut(ORMBase):
    """Full shape used for the Meeting Detail page -- everything at once."""
    id: int
    title: str
    date: datetime
    duration_seconds: int
    media_url: Optional[str] = None
    status: str
    host: UserOut
    participants: List[ParticipantOut] = []
    transcript_lines: List[TranscriptLineOut] = []
    summary: Optional[SummaryOut] = None
    action_items: List[ActionItemOut] = []
    outline_items: List[OutlineItemOut] = []
    meeting_tags: List[MeetingTagOut] = []


# ---------------------------------------------------------------------------
# GLOBAL SEARCH (bonus feature)
# ---------------------------------------------------------------------------
class GlobalSearchResultOut(BaseModel):
    meeting_id: int
    meeting_title: str
    match_type: str   # "title" | "transcript" | "summary" | "action_item"
    snippet: str
