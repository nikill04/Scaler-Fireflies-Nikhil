"use client";

/**
 * app/page.tsx
 * -------------
 * The homepage: the Meetings Library / Dashboard.
 *
 * This is a Next.js "page" file -- in the App Router, whatever component
 * lives at app/page.tsx renders at the "/" route automatically. That's the
 * one bit of Next.js "magic" here; everything inside this component is
 * just normal React: useState for filters, useEffect to fetch data
 * whenever filters change, and a render based on that state.
 *
 * Note the "use client" directive at the top -- it tells Next.js this
 * component (and everything it imports) runs in the browser, not on the
 * server. We use it because we need useState/useEffect/onClick, the same
 * things you'd use in any React app. Without "use client", Next.js would
 * try to render this on the server where none of those are available.
 */

import { useCallback, useEffect, useState } from "react";
import { Plus, Video } from "lucide-react";
import { listMeetings, listTags, deleteMeeting } from "@/lib/api";
import type { MeetingListItem, Tag, MeetingDetail } from "@/types";
import MeetingCard from "@/components/MeetingCard";
import LibraryFilterBar from "@/components/LibraryFilterBar";
import GlobalSearchBar from "@/components/GlobalSearchBar";
import CreateMeetingModal from "@/components/CreateMeetingModal";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";

export default function LibraryPage() {
  const [meetings, setMeetings] = useState<MeetingListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const [searchValue, setSearchValue] = useState("");
  const [participantValue, setParticipantValue] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [sortValue, setSortValue] = useState<"recent" | "oldest">("recent");

  const { showToast } = useToast();
  const router = useRouter();

  const fetchMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listMeetings({
        q: searchValue || undefined,
        participant: participantValue || undefined,
        tag: tagValue || undefined,
        sort: sortValue,
      });
      setMeetings(data);
    } catch {
      showToast("Couldn't load meetings. Is the backend running?", "error");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue, participantValue, tagValue, sortValue]);

  // Re-fetch whenever any filter changes. A small debounce on the text
  // inputs (search/participant) avoids firing a request on every keystroke.
  useEffect(() => {
    const timeoutId = setTimeout(fetchMeetings, 250);
    return () => clearTimeout(timeoutId);
  }, [fetchMeetings]);

  // Tags only need to be loaded once (used to populate the filter dropdown).
  useEffect(() => {
    listTags().then(setTags).catch(() => {});
  }, []);

  function handleCreated(meeting: MeetingDetail) {
    showToast("Meeting created", "success");
    router.push(`/meetings/${meeting.id}`);
  }

  async function handleDelete(meetingId: number, title: string) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteMeeting(meetingId);
      setMeetings((current) => current.filter((m) => m.id !== meetingId));
      showToast("Meeting deleted", "success");
    } catch {
      showToast("Couldn't delete the meeting.", "error");
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-6 sm:px-8 py-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">
            Meetings Library
          </h1>
          <p className="text-sm text-foreground-muted mt-0.5">
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""} recorded
          </p>
        </div>
        <div className="flex items-center gap-3">
          <GlobalSearchBar />
          <Button onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} /> New meeting
          </Button>
        </div>
      </div>

      {/* Filter row */}
      <div className="mb-6">
        <LibraryFilterBar
          searchValue={searchValue}
          onSearchChange={setSearchValue}
          participantValue={participantValue}
          onParticipantChange={setParticipantValue}
          tagValue={tagValue}
          onTagChange={setTagValue}
          sortValue={sortValue}
          onSortChange={setSortValue}
          availableTags={tags}
        />
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 rounded-2xl bg-surface-raised border border-border animate-pulse" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-soft text-accent flex items-center justify-center mb-4">
            <Video size={24} />
          </div>
          <h3 className="text-base font-medium text-foreground">No meetings found</h3>
          <p className="text-sm text-foreground-muted mt-1 max-w-sm">
            Try adjusting your filters, or create your first meeting to get started.
          </p>
          <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
            <Plus size={16} /> New meeting
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => (
            <div key={meeting.id} className="relative group/card">
              <MeetingCard meeting={meeting} />
              <button
                onClick={(e) => {
                  e.preventDefault();
                  handleDelete(meeting.id, meeting.title);
                }}
                className="absolute top-3 right-3 opacity-0 group-hover/card:opacity-100 transition-opacity text-xs text-danger bg-surface-raised border border-border rounded-md px-2 py-1 hover:bg-danger-soft"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}

      <CreateMeetingModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
