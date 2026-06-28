# Fireflies Clone — Meeting Notes & Transcription Platform

A functional clone of [Fireflies.ai](https://fireflies.ai), built as a full-stack SDE assignment.

Users can browse a library of meetings, open an interactive speaker-labeled transcript synced to a media player, read AI-generated summaries and action items, search across all meetings, export notes, and toggle dark mode.

**Stack:** FastAPI + SQLAlchemy + SQLite (backend) · Next.js 16 + TypeScript + Tailwind CSS (frontend)

---

## Table of Contents

1. [Quick Start (Local)](#quick-start-local)
2. [Architecture Overview](#architecture-overview)
3. [Database Schema](#database-schema)
4. [API Overview](#api-overview)
5. [Feature Checklist](#feature-checklist)
6. [Bonus Features Implemented](#bonus-features-implemented)
7. [Assumptions & Design Decisions](#assumptions--design-decisions)
8. [Project Structure](#project-structure)
9. [Deployment Guide](#deployment-guide)

---

## Quick Start (Local)

### Prerequisites
- Python 3.11+
- Node.js 18+

### 1. Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# (Optional) Configure the Groq AI key for the "Generate AI Summary" feature
cp .env.example .env
# Then open .env and paste your free key from https://console.groq.com
# The app works fully WITHOUT this key — that one button just shows a message.

# Seed the database with 4 realistic sample meetings
# (transcripts, summaries, action items, outlines, tags)
python -m app.seed

# Start the API server
uvicorn app.main:app --reload
```

The API is now running at **http://localhost:8000**.  
Visit **http://localhost:8000/docs** for interactive Swagger documentation.

### 2. Frontend

```bash
cd frontend

# Install dependencies
npm install

# Point the frontend at your local backend
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Start the dev server
npm run dev
```

Visit **http://localhost:3000**.

---

## Architecture Overview

```
┌─────────────────────────┐        REST/JSON         ┌──────────────────────────┐
│    Next.js Frontend      │ ────────────────────────▶│    FastAPI Backend        │
│  (TypeScript, React 19)  │ ◀──────────────────────── │  (Python, SQLAlchemy)    │
└─────────────────────────┘                            └──────────┬───────────────┘
                                                                   │
                                                                   ▼
                                                           ┌───────────────┐
                                                           │  SQLite (file) │
                                                           │  fireflies.db  │
                                                           └───────────────┘
```

**Frontend** — The frontend is almost entirely standard React. The only Next.js-specific pieces are:
- File-based routing: `app/page.tsx` → `/`, `app/meetings/[id]/page.tsx` → `/meetings/7` (equivalent to React Router's `:id` param)
- `"use client"` directive at the top of files that use `useState`/`useEffect`/event handlers

Everything else — state, data fetching (`fetch` in `useEffect`), component composition — is plain React.

**Backend** — A clean three-layer structure:
1. **`models.py`** — SQLAlchemy ORM classes = the actual database tables. Write a Python class, get a SQL table.
2. **`schemas.py`** — Pydantic classes = the JSON shapes sent over HTTP. Kept separate from DB models so we can control exactly what the API exposes.
3. **`routers/*.py`** — HTTP endpoints grouped by resource. FastAPI generates Swagger docs automatically from the type hints.

**Core interactive feature** (transcript ↔ player sync):
```
TranscriptPanel  -- click a line --> onSeek(start_time) --> parent passes to MediaPlayer.seekTo()
MediaPlayer      -- timeupdate event --> onTimeUpdate(currentTime) --> parent passes back to TranscriptPanel
TranscriptPanel  -- currentTime falls in [start_time, end_time) --> highlight that line + scrollIntoView
```

---

## Database Schema

9 tables. The deliberate design choice over the 6-table suggested schema: **`SummaryKeyPoint`** is a proper child table (not a JSON blob) and **`OutlineItem`** is its own table (not packed into Summary), because the assignment lists chapters/outline as a separate feature with its own shape (title + timestamp).

```
users
  id, name, email, avatar_url, role

meetings                         ← aggregate root; everything else hangs off this
  id, host_id (→ users), title, date, duration_seconds, media_url, status, created_at

participants
  id, meeting_id (→ meetings), name, avatar_url

transcript_lines                 ← the interactive feature; one row = one spoken segment
  id, meeting_id (→ meetings), speaker_name, start_time, end_time, text

summaries                        ← 1-to-1 with meetings (unique constraint on meeting_id)
  id, meeting_id (→ meetings), overview, generated_at

summary_key_points               ← real FK relationship instead of a JSON blob
  id, summary_id (→ summaries), text, order_index

action_items
  id, meeting_id (→ meetings), task, assignee_name, is_completed, created_at

outline_items                    ← meeting chapters; start_time lets UI seek to the chapter
  id, meeting_id (→ meetings), title, start_time, order_index

tags                             ← reusable labels shared across meetings
  id, name (unique)

meeting_tags                     ← many-to-many join table (one meeting, many tags; one tag, many meetings)
  id, meeting_id (→ meetings), tag_id (→ tags)
```

All child tables use `cascade="all, delete-orphan"` so deleting a meeting automatically deletes all its transcript lines, action items, summary, outline items, and tag links.

---

## API Overview

Base URL: `http://localhost:8000` (dev) or your deployed backend URL (prod).  
Full interactive docs: `GET /docs`

### Meetings
| Method | Path | What it does |
|--------|------|--------------|
| GET | `/meetings` | List all meetings. Query params: `q`, `participant`, `tag`, `date_from`, `date_to`, `sort` |
| GET | `/meetings/{id}` | Full detail: transcript, summary, action items, outline, participants, tags |
| POST | `/meetings` | Create a meeting. Optionally include `raw_transcript` text to auto-parse into lines |
| PATCH | `/meetings/{id}` | Update title, participants, or tags |
| DELETE | `/meetings/{id}` | Delete meeting and all its data (cascade) |

### Action Items
| Method | Path | What it does |
|--------|------|--------------|
| POST | `/meetings/{id}/action-items` | Add a task |
| PATCH | `/meetings/{id}/action-items/{item_id}` | Edit task, assignee, or toggle is_completed |
| DELETE | `/meetings/{id}/action-items/{item_id}` | Remove a task |

### Tags
| Method | Path | What it does |
|--------|------|--------------|
| GET | `/tags` | List all tags (for the filter dropdown) |

### Search & Export (Bonus)
| Method | Path | What it does |
|--------|------|--------------|
| GET | `/search?q=...` | Global search across titles, transcripts, summaries, action items |
| GET | `/meetings/{id}/export/summary?format=md\|txt` | Download summary as file |
| GET | `/meetings/{id}/export/transcript?format=md\|txt` | Download transcript as file |

### AI (Optional — requires GROQ_API_KEY)
| Method | Path | What it does |
|--------|------|--------------|
| POST | `/meetings/{id}/generate-summary` | Calls Llama 3.3 70B via Groq to generate a real summary from the transcript |

---

## Feature Checklist

### Core (Must Have)
- [x] Meetings library with title, date, duration, participants
- [x] Search and filter meetings (by title, participant, tag, date range)
- [x] Sort by recency / oldest
- [x] Sidebar navigation with profile footer and placeholder items
- [x] Interactive transcript with speaker labels and timestamps
- [x] Media player with seek bar (simulated playhead when no real audio file)
- [x] Click transcript line → seeks player
- [x] Player time → highlights active transcript line + auto-scrolls
- [x] Search within transcript with highlighted matches
- [x] AI summary panel with overview + key bullet points
- [x] Action items with add / edit / toggle-complete / delete
- [x] Outline / chapters tab with clickable timestamps
- [x] Create meeting (form + paste transcript + .txt file upload)
- [x] Edit meeting metadata (title, participants, tags)
- [x] Delete meeting (with confirmation)
- [x] All data persists in SQLite

### Mocked / Placeholder Sections
- [x] Real-time bot → "Coming soon" toast in sidebar
- [x] Actual speech-to-text → app uses seeded/uploaded transcripts
- [x] Integrations (Zoom, Google Meet, etc.) → sidebar placeholder
- [x] Team / collaboration → sidebar placeholder
- [x] Real auth → single seeded default user ("Nikhil Sharma")

---

## Bonus Features Implemented

- [x] **Dark mode** — toggled via ThemeToggle button in the sidebar; uses CSS custom properties so the entire color scheme switches instantly
- [x] **Global search** — searches across meeting titles, transcript text, summaries, and action items; results dropdown shows context snippets
- [x] **Export transcript or summary** — download as `.md` or `.txt` from the Summary tab
- [x] **Tags / topics and filtering** — many-to-many tag system; filter meetings by tag in the Library
- [x] **LLM-powered AI summary generation** — "Generate AI Summary" button calls Llama 3.3 70B via Groq (free API key at console.groq.com); replaces the seeded mock summary with a real one generated from the actual transcript text

---

## Assumptions & Design Decisions

1. **No real audio/video** — The assignment explicitly says real transcription is out of scope. The MediaPlayer uses an HTML5 `<audio>` element when a `media_url` is present; otherwise it uses a JavaScript interval to simulate the playhead ticking forward. Either way, clicking a transcript line seeks the player and the player's current time highlights the active transcript line.

2. **Mocked authentication** — A single default user ("Nikhil Sharma") is seeded, and all meetings are owned by that user. The frontend always acts as this user. Adding real auth would be a clean addition on top of the existing `User` model and `host_id` foreign key.

3. **`SummaryKeyPoint` as a real table** — The assignment suggested `bullet_points (JSON)` in the Summary table. Using a proper child table (`summary_key_points`) with a foreign key is better relational design: the database can enforce the relationship, individual bullet points can be queried and edited independently, and it demonstrates understanding of normalization.

4. **`OutlineItem` as a separate table** — The assignment lists "outline/chapters" as its own feature. Since it has its own distinct shape (title + timestamp, not a summary bullet), it belongs in its own table rather than being packed into the Summary.

5. **Tags many-to-many** — A meeting can have multiple tags; a tag appears on many meetings. This is the textbook case for a join table (`meeting_tags`). Tags are reused across meetings (looked up by name on creation, not duplicated).

6. **Plain `fetch` in `lib/api.ts`** — No React Query or SWR. This is intentional for readability: every API call is a plain async function the interviewer can follow line by line without knowing any library-specific APIs.

7. **`"use client"` on all components** — We use `useState`/`useEffect`/event handlers everywhere, so every component is a Client Component. This is the simplest correct approach for an SPA-style app; it means the Next.js code reads almost identically to a plain React + React Router app.

---

## Project Structure

```
fireflies-clone/
├── backend/
│   ├── app/
│   │   ├── main.py            # FastAPI app entry point + CORS + router registration
│   │   ├── database.py        # SQLAlchemy engine, session, Base
│   │   ├── models.py          # ORM table definitions (9 tables)
│   │   ├── schemas.py         # Pydantic request/response shapes
│   │   ├── seed.py            # Seeds 4 realistic sample meetings
│   │   ├── transcript_parser.py  # Parses "Speaker [MM:SS] text" format
│   │   └── routers/
│   │       ├── meetings.py    # CRUD for meetings
│   │       ├── action_items.py # CRUD for action items
│   │       ├── tags.py        # List tags
│   │       ├── search.py      # Global search (bonus)
│   │       ├── export.py      # Download transcript/summary (bonus)
│   │       └── ai.py          # LLM summary generation (bonus)
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/
    ├── app/
    │   ├── layout.tsx         # Root layout: AppShell wraps every page
    │   ├── page.tsx           # "/" → Meetings Library
    │   └── meetings/[id]/
    │       └── page.tsx       # "/meetings/7" → Meeting Detail
    ├── components/
    │   ├── Sidebar.tsx        # Dark left-hand nav rail
    │   ├── AppShell.tsx       # Sidebar + main content wrapper
    │   ├── MeetingCard.tsx    # Library grid card
    │   ├── MediaPlayer.tsx    # Audio player with seek bar
    │   ├── TranscriptPanel.tsx # Interactive transcript
    │   ├── NotesPanel.tsx     # Summary / Action Items / Outline tabs
    │   ├── SummaryTab.tsx     # AI summary + export + generate button
    │   ├── ActionItemsList.tsx # Task list with inline add/edit/complete
    │   ├── OutlineTab.tsx     # Chapter list with clickable timestamps
    │   ├── LibraryFilterBar.tsx # Filter/sort controls for the library
    │   ├── GlobalSearchBar.tsx  # Bonus: cross-meeting search dropdown
    │   ├── CreateMeetingModal.tsx # Create meeting form
    │   ├── EditMeetingModal.tsx   # Edit metadata form
    │   ├── ToastProvider.tsx  # Context + hook for toast notifications
    │   ├── ThemeToggle.tsx    # Dark/light mode toggle
    │   └── ui/               # Shared primitives (Button, Avatar, Modal, TagChip)
    ├── lib/
    │   ├── api.ts             # All API calls (typed, single source of truth)
    │   └── format.ts          # Date/duration/time formatting helpers
    ├── types/
    │   └── index.ts           # TypeScript interfaces matching the API schemas
    ├── next.config.ts
    └── package.json
```

---

## Deployment Guide

### Backend — Render (free tier)

1. Push your code to GitHub.
2. Create a new **Web Service** on [render.com](https://render.com).
3. Settings:
   - **Root Directory:** `backend`
   - **Build Command:** `pip install -r requirements.txt && python -m app.seed`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Under **Environment Variables**, add `GROQ_API_KEY` if you want the AI feature enabled.
5. Note the deployed URL (e.g. `https://your-app.onrender.com`).

### Frontend — Vercel (free tier)

1. Import your GitHub repo on [vercel.com](https://vercel.com).
2. Settings:
   - **Root Directory:** `frontend`
   - **Framework:** Next.js (auto-detected)
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = `https://your-app.onrender.com` (your Render backend URL)
4. Deploy.

> **Note:** Render's free tier spins down after inactivity; the first request after a cold start may take ~30 seconds. This is normal for free hosting.
