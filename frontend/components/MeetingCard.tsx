"use client";

/**
 * components/MeetingCard.tsx
 * -----------------------------
 * One card in the Meetings Library grid. Shows the title, date, duration,
 * participant avatars (stacked, like Fireflies/Google-Meet style), and
 * tags. Clicking anywhere on the card navigates to the detail page.
 */

import Link from "next/link";
import { Clock, Mic } from "lucide-react";
import type { MeetingListItem } from "@/types";
import { formatDuration, formatMeetingDate } from "@/lib/format";
import Avatar from "./ui/Avatar";
import TagChip from "./ui/TagChip";

export default function MeetingCard({ meeting }: { meeting: MeetingListItem }) {
  return (
    <Link
      href={`/meetings/${meeting.id}`}
      className="group block rounded-2xl border border-border bg-surface-raised p-5 hover:border-accent/40 hover:shadow-md transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-accent transition-colors">
          {meeting.title}
        </h3>
        {meeting.status === "processing" && (
          <span className="shrink-0 flex items-center gap-1 text-[11px] font-medium text-warning bg-warning-soft rounded-full px-2 py-0.5">
            <Mic size={11} /> Processing
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 mt-2 text-xs text-foreground-muted">
        <span>{formatMeetingDate(meeting.date)}</span>
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {formatDuration(meeting.duration_seconds)}
        </span>
      </div>

      {meeting.meeting_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {meeting.meeting_tags.map((mt) => (
            <TagChip key={mt.tag.id} label={mt.tag.name} />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <div className="flex items-center -space-x-2">
          {meeting.participants.slice(0, 4).map((p) => (
            <div key={p.id} className="ring-2 ring-surface-raised rounded-full">
              <Avatar name={p.name} avatarUrl={p.avatar_url} size={26} />
            </div>
          ))}
          {meeting.participants.length > 4 && (
            <div className="ring-2 ring-surface-raised rounded-full w-[26px] h-[26px] flex items-center justify-center bg-surface-sunken text-[10px] font-medium text-foreground-muted">
              +{meeting.participants.length - 4}
            </div>
          )}
        </div>
        <span className="text-xs text-foreground-muted">
          {meeting.participants.length} participant{meeting.participants.length !== 1 ? "s" : ""}
        </span>
      </div>
    </Link>
  );
}
