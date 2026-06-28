/**
 * lib/api.ts
 * -----------
 * This file is the ONLY place in the frontend that knows the backend's URL
 * and endpoint paths. Every component calls a function from here instead of
 * calling `fetch` directly -- that way, if the backend URL or a route path
 * ever changes, there's exactly one file to update.
 *
 * Each function does three things:
 *   1. Build the URL (using API_BASE_URL + the endpoint path)
 *   2. Call fetch() with the right method/body
 *   3. Parse the JSON response and return it, typed
 *
 * This is intentionally plain `fetch` (no React Query / SWR / Axios) so it
 * reads exactly like the REST calls you'd already write in a React app --
 * just async functions you call from useEffect or an event handler.
 */

import type {
  MeetingListItem,
  MeetingDetail,
  MeetingCreatePayload,
  MeetingUpdatePayload,
  ActionItem,
  ActionItemCreatePayload,
  ActionItemUpdatePayload,
  Tag,
  GlobalSearchResult,
  Summary,
} from "@/types";

// In dev this points at your local FastAPI server. In production, set
// NEXT_PUBLIC_API_URL in your hosting platform's environment variables to
// the deployed backend URL (see README for deployment instructions).
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Generic helper that every other function below uses.
 * Centralizes: building the full URL, setting JSON headers, throwing a
 * readable error if the response isn't OK, and parsing the JSON body.
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(
      `API error ${res.status} on ${path}: ${errorBody || res.statusText}`
    );
  }

  // DELETE requests return 204 No Content -- there's no JSON body to parse.
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Meetings
// ---------------------------------------------------------------------------

export interface MeetingFilters {
  q?: string;
  participant?: string;
  tag?: string;
  sort?: "recent" | "oldest";
}

export function listMeetings(filters: MeetingFilters = {}): Promise<MeetingListItem[]> {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.participant) params.set("participant", filters.participant);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.sort) params.set("sort", filters.sort);

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<MeetingListItem[]>(`/meetings${query}`);
}

export function getMeeting(id: number): Promise<MeetingDetail> {
  return apiFetch<MeetingDetail>(`/meetings/${id}`);
}

export function createMeeting(payload: MeetingCreatePayload): Promise<MeetingDetail> {
  return apiFetch<MeetingDetail>(`/meetings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateMeeting(id: number, payload: MeetingUpdatePayload): Promise<MeetingDetail> {
  return apiFetch<MeetingDetail>(`/meetings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteMeeting(id: number): Promise<void> {
  return apiFetch<void>(`/meetings/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Action items
// ---------------------------------------------------------------------------

export function createActionItem(
  meetingId: number,
  payload: ActionItemCreatePayload
): Promise<ActionItem> {
  return apiFetch<ActionItem>(`/meetings/${meetingId}/action-items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateActionItem(
  meetingId: number,
  itemId: number,
  payload: ActionItemUpdatePayload
): Promise<ActionItem> {
  return apiFetch<ActionItem>(`/meetings/${meetingId}/action-items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteActionItem(meetingId: number, itemId: number): Promise<void> {
  return apiFetch<void>(`/meetings/${meetingId}/action-items/${itemId}`, {
    method: "DELETE",
  });
}

// ---------------------------------------------------------------------------
// Tags
// ---------------------------------------------------------------------------

export function listTags(): Promise<Tag[]> {
  return apiFetch<Tag[]>(`/tags`);
}

// ---------------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------------

export function globalSearch(q: string): Promise<GlobalSearchResult[]> {
  return apiFetch<GlobalSearchResult[]>(`/search?q=${encodeURIComponent(q)}`);
}

// ---------------------------------------------------------------------------
// AI summary generation (optional, requires backend GROQ_API_KEY)
// ---------------------------------------------------------------------------

export function generateSummary(meetingId: number): Promise<Summary> {
  return apiFetch<Summary>(`/meetings/${meetingId}/generate-summary`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Export (these return a download URL rather than JSON, so the browser
// itself can handle the file download — see usage in MeetingDetail page)
// ---------------------------------------------------------------------------

export function getExportSummaryUrl(meetingId: number, format: "md" | "txt"): string {
  return `${API_BASE_URL}/meetings/${meetingId}/export/summary?format=${format}`;
}

export function getExportTranscriptUrl(meetingId: number, format: "md" | "txt"): string {
  return `${API_BASE_URL}/meetings/${meetingId}/export/transcript?format=${format}`;
}
