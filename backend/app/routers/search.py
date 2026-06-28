"""
routers/search.py
-------------------
Bonus feature: GLOBAL SEARCH across all meetings.

This is different from the in-transcript search on the detail page (which
only searches within one meeting that's already loaded on the frontend).
Global search hits the database directly and looks across every meeting's:
  - title
  - transcript line text
  - summary overview
  - action item text

and returns a flat list of matches with a small snippet, so the frontend
can show "12 results across 4 meetings" the way Fireflies' own search does.

Implementation note: we use SQLite's `LIKE` (via SQLAlchemy's `.ilike()`)
rather than a full-text search engine. For an assignment-scale app with a
handful of seeded meetings this is the right amount of complexity --
a dedicated search index (e.g. SQLite FTS5, Elasticsearch) would be the
real-world next step, but isn't needed to demonstrate the feature works.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/search", tags=["search"])


def _snippet(text: str, query: str, context_chars: int = 40) -> str:
    """Returns a short excerpt of `text` centered around the matched `query`."""
    lower_text = text.lower()
    lower_query = query.lower()
    idx = lower_text.find(lower_query)
    if idx == -1:
        return text[:80]
    start = max(0, idx - context_chars)
    end = min(len(text), idx + len(query) + context_chars)
    prefix = "..." if start > 0 else ""
    suffix = "..." if end < len(text) else ""
    return f"{prefix}{text[start:end]}{suffix}"


@router.get("", response_model=List[schemas.GlobalSearchResultOut])
def global_search(q: str = Query(..., min_length=1), db: Session = Depends(get_db)):
    results: List[schemas.GlobalSearchResultOut] = []
    like_pattern = f"%{q}%"

    # 1) Title matches
    title_matches = db.query(models.Meeting).filter(models.Meeting.title.ilike(like_pattern)).all()
    for m in title_matches:
        results.append(schemas.GlobalSearchResultOut(
            meeting_id=m.id, meeting_title=m.title, match_type="title", snippet=m.title,
        ))

    # 2) Transcript line matches
    line_matches = (
        db.query(models.TranscriptLine)
        .join(models.Meeting)
        .filter(models.TranscriptLine.text.ilike(like_pattern))
        .all()
    )
    for line in line_matches:
        results.append(schemas.GlobalSearchResultOut(
            meeting_id=line.meeting_id,
            meeting_title=line.meeting.title,
            match_type="transcript",
            snippet=f"{line.speaker_name}: {_snippet(line.text, q)}",
        ))

    # 3) Summary matches
    summary_matches = (
        db.query(models.Summary)
        .join(models.Meeting)
        .filter(models.Summary.overview.ilike(like_pattern))
        .all()
    )
    for s in summary_matches:
        results.append(schemas.GlobalSearchResultOut(
            meeting_id=s.meeting_id,
            meeting_title=s.meeting.title,
            match_type="summary",
            snippet=_snippet(s.overview, q),
        ))

    # 4) Action item matches
    action_matches = (
        db.query(models.ActionItem)
        .join(models.Meeting)
        .filter(models.ActionItem.task.ilike(like_pattern))
        .all()
    )
    for a in action_matches:
        results.append(schemas.GlobalSearchResultOut(
            meeting_id=a.meeting_id,
            meeting_title=a.meeting.title,
            match_type="action_item",
            snippet=_snippet(a.task, q),
        ))

    return results
