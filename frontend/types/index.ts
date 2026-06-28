/**
 * types/index.ts
 * ----------------
 * These TypeScript types are a 1-to-1 mirror of the Pydantic schemas in
 * backend/app/schemas.py. Whenever you see a type here, there's a class
 * with the exact same name and fields on the backend.
 *
 * This is the contract between frontend and backend: as long as both
 * sides agree on these shapes, the two can be built and reasoned about
 * independently.
 */

export interface User {
  id: number;
  name: string;
  email: string;
  avatar_url: string | null;
  role: string;
}

export interface Participant {
  id: number;
  name: string;
  avatar_url: string | null;
}

export interface TranscriptLine {
  id: number;
  speaker_name: string;
  start_time: number; // seconds
  end_time: number;   // seconds
  text: string;
}

export interface SummaryKeyPoint {
  id: number;
  text: string;
  order_index: number;
}

export interface Summary {
  id: number;
  overview: string;
  generated_at: string;
  key_points: SummaryKeyPoint[];
}

export interface ActionItem {
  id: number;
  task: string;
  assignee_name: string | null;
  is_completed: boolean;
}

export interface OutlineItem {
  id: number;
  title: string;
  start_time: number;
  order_index: number;
}

export interface Tag {
  id: number;
  name: string;
}

export interface MeetingTagLink {
  tag: Tag;
}

// Lightweight shape used on the Meetings Library page.
export interface MeetingListItem {
  id: number;
  title: string;
  date: string;
  duration_seconds: number;
  status: string;
  participants: Participant[];
  meeting_tags: MeetingTagLink[];
}

// Full shape used on the Meeting Detail page.
export interface MeetingDetail {
  id: number;
  title: string;
  date: string;
  duration_seconds: number;
  media_url: string | null;
  status: string;
  host: User;
  participants: Participant[];
  transcript_lines: TranscriptLine[];
  summary: Summary | null;
  action_items: ActionItem[];
  outline_items: OutlineItem[];
  meeting_tags: MeetingTagLink[];
}

export interface GlobalSearchResult {
  meeting_id: number;
  meeting_title: string;
  match_type: "title" | "transcript" | "summary" | "action_item";
  snippet: string;
}

// Payload shapes for creating/updating things (mirrors XCreate/XUpdate schemas).
export interface MeetingCreatePayload {
  title: string;
  duration_seconds?: number;
  media_url?: string | null;
  participant_names: string[];
  tag_names: string[];
  raw_transcript?: string | null;
}

export interface MeetingUpdatePayload {
  title?: string;
  participant_names?: string[];
  tag_names?: string[];
}

export interface ActionItemCreatePayload {
  task: string;
  assignee_name?: string | null;
}

export interface ActionItemUpdatePayload {
  task?: string;
  assignee_name?: string | null;
  is_completed?: boolean;
}
