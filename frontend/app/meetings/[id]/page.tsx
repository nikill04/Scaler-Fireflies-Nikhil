"use client";

/**
 * app/meetings/[id]/page.tsx
 * -----------------------------
 * The Meeting Detail page -- the core screen of the whole app.
 *
 * Routing note: the folder name `[id]` is Next.js's syntax for a dynamic
 * route segment. Visiting /meetings/7 renders this component with
 * `params.id === "7"`. This is the Next.js equivalent of a React Router
 * route like <Route path="/meetings/:id" element={<MeetingDetail />} />.
 *
 * This page fetches the full MeetingDetail object once on mount, then
 * owns `currentTime` (the single source of truth for "where the playhead
 * is"), passing it down to the player and transcript so they stay in sync,
 * and passing `onSeek` down so either one can move the playhead.
 */

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { getMeeting, deleteMeeting } from "@/lib/api";
import type { MeetingDetail, Summary, ActionItem } from "@/types";
import MediaPlayer, { MediaPlayerHandle } from "@/components/MediaPlayer";
import TranscriptPanel from "@/components/TranscriptPanel";
import NotesPanel from "@/components/NotesPanel";
import EditMeetingModal from "@/components/EditMeetingModal";
import Avatar from "@/components/ui/Avatar";
import TagChip from "@/components/ui/TagChip";
import Button from "@/components/ui/Button";
import { formatMeetingDate, formatDuration } from "@/lib/format";
import { useToast } from "@/components/ToastProvider";

export default function MeetingDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { showToast } = useToast();

  const [meeting, setMeeting] = useState<MeetingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [editModalOpen, setEditModalOpen] = useState(false);

  const playerRef = useRef<MediaPlayerHandle>(null);

  useEffect(() => {
    const meetingId = Number(params.id);

    if (!meetingId) {
      // Defer to a microtask so this isn't a synchronous setState call
      // directly in the effect body (keeps React's effect linting happy
      // and avoids a same-tick cascading render).
      Promise.resolve().then(() => {
        setNotFound(true);
        setLoading(false);
      });
      return;
    }

    getMeeting(meetingId)
      .then(setMeeting)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [params.id]);

  function handleSeek(seconds: number) {
    setCurrentTime(seconds);
    playerRef.current?.seekTo(seconds);
  }

  function handleSummaryChange(summary: Summary) {
    setMeeting((prev) => (prev ? { ...prev, summary } : prev));
  }

  function handleActionItemsChange(items: ActionItem[]) {
    setMeeting((prev) => (prev ? { ...prev, action_items: items } : prev));
  }

  async function handleDelete() {
    if (!meeting) return;
    if (!confirm(`Delete "${meeting.title}"? This cannot be undone.`)) return;
    try {
      await deleteMeeting(meeting.id);
      showToast("Meeting deleted", "success");
      router.push("/");
    } catch {
      showToast("Couldn't delete the meeting.", "error");
    }
  }

  // Build a lookup of participant name -> avatar, so the transcript panel
  // can show the right avatar image next to each speaker's lines.
  const participantAvatars: Record<string, string | null> = {};
  meeting?.participants.forEach((p) => {
    participantAvatars[p.name] = p.avatar_url;
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
        <div className="h-8 w-48 bg-surface-raised rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5">
          <div className="h-[600px] bg-surface-raised rounded-2xl animate-pulse" />
          <div className="h-[600px] bg-surface-raised rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (notFound || !meeting) {
    return (
      <div className="max-w-7xl mx-auto px-6 sm:px-8 py-16 text-center">
        <h2 className="text-lg font-semibold text-foreground">Meeting not found</h2>
        <p className="text-sm text-foreground-muted mt-1">
          It may have been deleted, or the link is incorrect.
        </p>
        <Button className="mt-4" onClick={() => router.push("/")}>
          <ArrowLeft size={15} /> Back to library
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/")}
        className="flex items-center gap-1.5 text-sm text-foreground-muted hover:text-foreground mb-4 transition-colors"
      >
        <ArrowLeft size={15} /> Back to library
      </button>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            {meeting.title}
          </h1>
          <div className="flex items-center gap-3 mt-1.5 text-sm text-foreground-muted">
            <span>{formatMeetingDate(meeting.date)}</span>
            <span>·</span>
            <span>{formatDuration(meeting.duration_seconds)}</span>
            <span>·</span>
            <span>Hosted by {meeting.host.name}</span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center -space-x-2">
              {meeting.participants.map((p) => (
                <div key={p.id} className="ring-2 ring-surface-sunken rounded-full" title={p.name}>
                  <Avatar name={p.name} avatarUrl={p.avatar_url} size={26} />
                </div>
              ))}
            </div>
            {meeting.meeting_tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 ml-2">
                {meeting.meeting_tags.map((mt) => (
                  <TagChip key={mt.tag.id} label={mt.tag.name} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="secondary" onClick={() => setEditModalOpen(true)}>
            <Pencil size={14} /> Edit
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            <Trash2 size={14} /> Delete
          </Button>
        </div>
      </div>

      {/* Player */}
      <div className="mb-5">
        <MediaPlayer
          ref={playerRef}
          durationSeconds={meeting.duration_seconds}
          mediaUrl={meeting.media_url}
          onTimeUpdate={setCurrentTime}
        />
      </div>

      {/* Transcript + Notes panel, side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-5 h-[600px]">
        <TranscriptPanel
          lines={meeting.transcript_lines}
          currentTime={currentTime}
          onSeek={handleSeek}
          participantAvatars={participantAvatars}
        />
        <NotesPanel
          meetingId={meeting.id}
          summary={meeting.summary}
          onSummaryChange={handleSummaryChange}
          actionItems={meeting.action_items}
          onActionItemsChange={handleActionItemsChange}
          outlineItems={meeting.outline_items}
          onSeek={handleSeek}
          hasTranscript={meeting.transcript_lines.length > 0}
        />
      </div>

      <EditMeetingModal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        meeting={meeting}
        onUpdated={(updated) => setMeeting(updated)}
      />
    </div>
  );
}
