"""
routers/export.py
-------------------
Bonus feature: EXPORT a meeting's summary or full transcript as a
downloadable file (.md or .txt).

  GET /meetings/{id}/export/summary?format=md|txt
  GET /meetings/{id}/export/transcript?format=md|txt

We build the file content as a plain string in memory and return it with a
Content-Disposition header, which tells the browser "treat this as a file
download" rather than rendering it as a page. No file is actually saved to
disk on the server -- it's generated fresh on each request.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models

router = APIRouter(prefix="/meetings/{meeting_id}/export", tags=["export"])


def _get_meeting_or_404(db: Session, meeting_id: int) -> models.Meeting:
    meeting = (
        db.query(models.Meeting)
        .options(
            joinedload(models.Meeting.summary).joinedload(models.Summary.key_points),
            joinedload(models.Meeting.transcript_lines),
            joinedload(models.Meeting.action_items),
        )
        .filter(models.Meeting.id == meeting_id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return meeting


def _seconds_to_clock(seconds: float) -> str:
    total = int(seconds)
    minutes, secs = divmod(total, 60)
    return f"{minutes:02d}:{secs:02d}"


def _build_summary_markdown(meeting: models.Meeting) -> str:
    lines = [f"# {meeting.title} - Summary", ""]
    if meeting.summary:
        lines.append(meeting.summary.overview)
        lines.append("")
        if meeting.summary.key_points:
            lines.append("## Key Points")
            for kp in meeting.summary.key_points:
                lines.append(f"- {kp.text}")
            lines.append("")
    if meeting.action_items:
        lines.append("## Action Items")
        for item in meeting.action_items:
            checkbox = "[x]" if item.is_completed else "[ ]"
            assignee = f" (@{item.assignee_name})" if item.assignee_name else ""
            lines.append(f"- {checkbox} {item.task}{assignee}")
    return "\n".join(lines)


def _build_transcript_text(meeting: models.Meeting) -> str:
    lines = [f"{meeting.title} - Transcript", "=" * 40, ""]
    for line in meeting.transcript_lines:
        ts = _seconds_to_clock(line.start_time)
        lines.append(f"[{ts}] {line.speaker_name}: {line.text}")
    return "\n".join(lines)


def _file_response(content: str, filename: str, media_type: str) -> Response:
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/summary")
def export_summary(meeting_id: int, format: str = Query("md", pattern="^(md|txt)$"), db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, meeting_id)
    content = _build_summary_markdown(meeting)
    ext = "md" if format == "md" else "txt"
    media_type = "text/markdown" if format == "md" else "text/plain"
    safe_title = meeting.title.replace(" ", "_")
    return _file_response(content, f"{safe_title}_summary.{ext}", media_type)


@router.get("/transcript")
def export_transcript(meeting_id: int, format: str = Query("txt", pattern="^(md|txt)$"), db: Session = Depends(get_db)):
    meeting = _get_meeting_or_404(db, meeting_id)
    content = _build_transcript_text(meeting)
    ext = "md" if format == "md" else "txt"
    media_type = "text/markdown" if format == "md" else "text/plain"
    safe_title = meeting.title.replace(" ", "_")
    return _file_response(content, f"{safe_title}_transcript.{ext}", media_type)
