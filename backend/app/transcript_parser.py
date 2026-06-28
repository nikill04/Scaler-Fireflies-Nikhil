"""
transcript_parser.py
----------------------
Small, focused utility: turn raw transcript TEXT (pasted into a form or
uploaded as a .txt file) into a list of (speaker, start_time, end_time, text)
tuples that we can save as TranscriptLine rows.

We support one simple, predictable format so the parser stays easy to read
and explain:

    Speaker Name [00:12] What they said goes here.
    Another Speaker [00:47] Their reply goes here.

- The bracket holds a MM:SS (or HH:MM:SS) timestamp -> this becomes start_time.
- end_time is simply the next line's start_time (or +5s for the last line).
- Any line that doesn't match the pattern is skipped (so blank lines or
  stray text in an uploaded file won't crash the import).

This is intentionally simple rather than trying to parse every possible
real-world transcript format (.vtt, .srt, etc.) -- the assignment says
transcription itself is mocked, so the goal here is just a clean, reliable
way to get structured rows out of plain text.
"""

import re
from typing import List, Tuple

LINE_PATTERN = re.compile(
    r"^\s*(?P<speaker>[^\[\]]+?)\s*\[(?P<timestamp>\d{1,2}:\d{2}(?::\d{2})?)\]\s*(?P<text>.+)$"
)


def _timestamp_to_seconds(ts: str) -> float:
    """Converts 'MM:SS' or 'HH:MM:SS' into total seconds as a float."""
    parts = [int(p) for p in ts.split(":")]
    if len(parts) == 2:
        minutes, seconds = parts
        return float(minutes * 60 + seconds)
    hours, minutes, seconds = parts
    return float(hours * 3600 + minutes * 60 + seconds)


def parse_transcript_text(raw_text: str) -> List[Tuple[str, float, float, str]]:
    """
    Returns a list of tuples: (speaker_name, start_time, end_time, text)
    ready to be inserted as TranscriptLine rows.
    """
    raw_lines = [line for line in raw_text.splitlines() if line.strip()]
    parsed = []

    for line in raw_lines:
        match = LINE_PATTERN.match(line)
        if not match:
            continue
        speaker = match.group("speaker").strip()
        start_time = _timestamp_to_seconds(match.group("timestamp"))
        text = match.group("text").strip()
        parsed.append([speaker, start_time, None, text])  # end_time filled in below

    # Fill in end_time for each line using the next line's start_time.
    for i in range(len(parsed)):
        if i + 1 < len(parsed):
            parsed[i][2] = parsed[i + 1][1]
        else:
            parsed[i][2] = parsed[i][1] + 5.0  # last line: assume 5 seconds long

    return [tuple(row) for row in parsed]
