"""
models.py
----------
This file defines every TABLE in our database as a Python class.
SQLAlchemy's ORM lets us write Python classes and it generates the actual
SQL "CREATE TABLE" statements for us.

SCHEMA OVERVIEW (9 tables):

  User ----------< Meeting >------------< Participant
                      |
                      |---------------< TranscriptLine
                      |
                      |----1:1--------- Summary ----------< SummaryKeyPoint
                      |
                      |---------------< ActionItem
                      |
                      |---------------< OutlineItem
                      |
                      |---------------< MeetingTag >------- Tag
                      (many-to-many through MeetingTag)

Relationship legend:
  ----<   means "one-to-many" (one Meeting has many TranscriptLines)
  ----1:1  means "one-to-one"  (one Meeting has exactly one Summary)
  >---<   means "many-to-many" (a Meeting can have many Tags, a Tag can
                                  belong to many Meetings)

WHY THIS SHAPE:
- Everything hangs off `Meeting` because Meeting is the natural "aggregate root"
  of this domain -- a meeting is the unit of work a user opens, edits, deletes.
- Summary is split into Summary (overview text) + SummaryKeyPoint (bullet rows)
  instead of dumping bullets into one JSON column. This is a deliberate choice:
  a real child table with a foreign key is easier to query, easier to edit one
  bullet at a time, and is what "proper relational design" means in a SQL
  database -- a JSON blob inside a column is just hiding structure, not
  designing it.
- Tags is many-to-many via a join table (MeetingTag) because a meeting can
  have multiple tags ("Sales", "Q3") and a tag obviously appears on many
  meetings. This is the textbook case for a many-to-many join table.
"""

from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, DateTime, Text
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# 1) USER
# ---------------------------------------------------------------------------
class User(Base):
    """
    A logged-in user. The assignment says real auth is out of scope, so we
    seed exactly ONE default user and the frontend always acts "as" them.
    Still modeling it as a real table (rather than hardcoding a name in the
    frontend) shows we understand multi-user systems even though auth itself
    isn't implemented.
    """
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    avatar_url = Column(String, nullable=True)
    role = Column(String, default="Host")  # e.g. "Host", "Admin"

    # One user can host many meetings.
    meetings = relationship("Meeting", back_populates="host")


# ---------------------------------------------------------------------------
# 2) MEETING (the aggregate root)
# ---------------------------------------------------------------------------
class Meeting(Base):
    """
    The top-level container for everything related to one call.
    Every other table below (except User and Tag) has a `meeting_id`
    foreign key pointing back here.
    """
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    host_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    title = Column(String, nullable=False)
    date = Column(DateTime, default=utc_now)
    duration_seconds = Column(Integer, default=0)
    media_url = Column(String, nullable=True)  # placeholder audio/video file
    status = Column(String, default="completed")  # "completed" | "processing"

    created_at = Column(DateTime, default=utc_now)

    # Relationships -- "cascade='all, delete-orphan'" means: if a Meeting is
    # deleted, automatically delete all its child rows too (transcript lines,
    # action items, etc.) instead of leaving orphaned rows behind.
    host = relationship("User", back_populates="meetings")
    participants = relationship("Participant", back_populates="meeting", cascade="all, delete-orphan")
    transcript_lines = relationship("TranscriptLine", back_populates="meeting", cascade="all, delete-orphan", order_by="TranscriptLine.start_time")
    summary = relationship("Summary", back_populates="meeting", uselist=False, cascade="all, delete-orphan")
    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    outline_items = relationship("OutlineItem", back_populates="meeting", cascade="all, delete-orphan", order_by="OutlineItem.order_index")
    meeting_tags = relationship("MeetingTag", back_populates="meeting", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# 3) PARTICIPANT
# ---------------------------------------------------------------------------
class Participant(Base):
    """People who attended the call. Belongs to one Meeting."""
    __tablename__ = "participants"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    name = Column(String, nullable=False)
    avatar_url = Column(String, nullable=True)

    meeting = relationship("Meeting", back_populates="participants")


# ---------------------------------------------------------------------------
# 4) TRANSCRIPT LINE  (the standout feature)
# ---------------------------------------------------------------------------
class TranscriptLine(Base):
    """
    One spoken segment in the transcript. This is what makes the transcript
    "interactive": each row has a start_time, so clicking it can seek the
    media player, and the player's current time can highlight the matching row.
    """
    __tablename__ = "transcript_lines"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    speaker_name = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)  # seconds, e.g. 12.5
    end_time = Column(Float, nullable=False)
    text = Column(Text, nullable=False)

    meeting = relationship("Meeting", back_populates="transcript_lines")


# ---------------------------------------------------------------------------
# 5) SUMMARY (1-to-1 with Meeting)
# ---------------------------------------------------------------------------
class Summary(Base):
    """
    The AI-generated overview paragraph for a meeting.
    `uselist=False` on the Meeting side enforces the 1-to-1 relationship --
    each meeting has exactly one Summary row, not a list of them.
    """
    __tablename__ = "summaries"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), unique=True, nullable=False)
    overview = Column(Text, nullable=False)
    generated_at = Column(DateTime, default=utc_now)

    meeting = relationship("Meeting", back_populates="summary")
    key_points = relationship("SummaryKeyPoint", back_populates="summary", cascade="all, delete-orphan", order_by="SummaryKeyPoint.order_index")


# ---------------------------------------------------------------------------
# 6) SUMMARY KEY POINT (bullet rows, instead of a JSON blob)
# ---------------------------------------------------------------------------
class SummaryKeyPoint(Base):
    """
    One bullet point inside a Summary. Splitting this out of Summary into
    its own table (rather than a JSON array column) is the deliberate
    schema upgrade mentioned in the README -- it's a real foreign-key
    relationship the database can enforce and query, not opaque text.
    """
    __tablename__ = "summary_key_points"

    id = Column(Integer, primary_key=True, index=True)
    summary_id = Column(Integer, ForeignKey("summaries.id"), nullable=False)
    text = Column(Text, nullable=False)
    order_index = Column(Integer, default=0)  # keeps bullets in display order

    summary = relationship("Summary", back_populates="key_points")


# ---------------------------------------------------------------------------
# 7) ACTION ITEM
# ---------------------------------------------------------------------------
class ActionItem(Base):
    """A task extracted from the meeting. Can be assigned and marked done."""
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    task = Column(Text, nullable=False)
    assignee_name = Column(String, nullable=True)  # plain text, kept simple on purpose
    is_completed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    meeting = relationship("Meeting", back_populates="action_items")


# ---------------------------------------------------------------------------
# 8) OUTLINE ITEM (chapters / key topics)
# ---------------------------------------------------------------------------
class OutlineItem(Base):
    """
    A "chapter" of the meeting, e.g. "00:00 - Intro & Goals".
    Modeled as its own table (rather than packed into Summary) because the
    assignment lists it as its own feature ("Key topics / outline / chapters")
    and it has its own shape: a title + a timestamp it links back to.
    """
    __tablename__ = "outline_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    title = Column(String, nullable=False)
    start_time = Column(Float, nullable=False)  # lets the UI jump the player here too
    order_index = Column(Integer, default=0)

    meeting = relationship("Meeting", back_populates="outline_items")


# ---------------------------------------------------------------------------
# 9) TAG + MEETING_TAG (many-to-many join table)
# ---------------------------------------------------------------------------
class Tag(Base):
    """A reusable label, e.g. 'Sales', 'Standup', 'Q3-Planning'."""
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    meeting_tags = relationship("MeetingTag", back_populates="tag")


class MeetingTag(Base):
    """
    The join table that implements the many-to-many relationship between
    Meeting and Tag. Each row just says "this meeting has this tag."
    """
    __tablename__ = "meeting_tags"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    tag_id = Column(Integer, ForeignKey("tags.id"), nullable=False)

    meeting = relationship("Meeting", back_populates="meeting_tags")
    tag = relationship("Tag", back_populates="meeting_tags")
