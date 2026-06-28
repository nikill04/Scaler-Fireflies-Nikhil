"""
routers/ai.py
---------------
ONE optional endpoint that makes a REAL call to an LLM (Groq) to regenerate
a meeting's summary, overview + key points + action items, from its actual
transcript text.

  POST /meetings/{id}/generate-summary

This is intentionally separate from the seeded mock summaries:
- Seed data (app/seed.py) uses hand-written mock summaries so the app works
  immediately, with zero external dependencies, even with no API key set.
- This endpoint is the "prove it's not just hardcoded" feature -- a live
  demonstration that the same UI can be powered by a real LLM call given an
  actual transcript, exactly like the assignment's note that summaries
  "can be mocked, seeded, OR LLM-generated."

If no GROQ_API_KEY is set in the environment, this route returns a clear
503 error instead of crashing -- so the rest of the app keeps working even
without an API key configured.
"""

import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app import models, schemas

router = APIRouter(prefix="/meetings/{meeting_id}", tags=["ai"])

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")


def _build_transcript_text(meeting: models.Meeting) -> str:
    return "\n".join(f"{l.speaker_name}: {l.text}" for l in meeting.transcript_lines)


@router.post("/generate-summary", response_model=schemas.SummaryOut)
def generate_summary(meeting_id: int, db: Session = Depends(get_db)):
    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=503,
            detail="AI generation is not configured. Set the GROQ_API_KEY environment variable to enable this feature.",
        )

    meeting = (
        db.query(models.Meeting)
        .options(joinedload(models.Meeting.transcript_lines))
        .filter(models.Meeting.id == meeting_id)
        .first()
    )
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if not meeting.transcript_lines:
        raise HTTPException(status_code=400, detail="This meeting has no transcript to summarize.")

    transcript_text = _build_transcript_text(meeting)

    # Lazy import so the whole app doesn't fail to start if the `groq`
    # package isn't installed in an environment that never uses this route.
    from groq import Groq
    client = Groq(api_key=GROQ_API_KEY)

    prompt = f"""You are an assistant that summarizes meeting transcripts.
Read the transcript below and return ONLY a JSON object (no markdown, no preamble)
with this exact shape:
{{
  "overview": "a 2-3 sentence overview paragraph",
  "key_points": ["bullet 1", "bullet 2", "..."],
  "action_items": ["task 1", "task 2", "..."]
}}

Transcript:
{transcript_text}
"""

    completion = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.3,
    )

    raw_content = completion.choices[0].message.content.strip()
    # Defensive cleanup in case the model wraps the JSON in ```json fences.
    raw_content = raw_content.replace("```json", "").replace("```", "").strip()

    try:
        parsed = json.loads(raw_content)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="AI returned an unexpected format. Please try again.")

    # Replace the existing summary (and its key points) with the new one.
    if meeting.summary:
        db.delete(meeting.summary)
        db.commit()

    summary = models.Summary(meeting_id=meeting.id, overview=parsed.get("overview", ""))
    db.add(summary)
    db.commit()
    db.refresh(summary)

    for idx, point in enumerate(parsed.get("key_points", [])):
        db.add(models.SummaryKeyPoint(summary_id=summary.id, text=point, order_index=idx))

    # Also add any newly suggested action items (left un-assigned, not
    # auto-completed) so the AI's output is reflected across the whole page.
    for task in parsed.get("action_items", []):
        db.add(models.ActionItem(meeting_id=meeting.id, task=task))

    db.commit()
    db.refresh(summary)
    return summary
