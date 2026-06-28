"use client";

/**
 * components/OutlineTab.tsx
 * ----------------------------
 * The "Outline / Chapters" tab. Each item is a topic with a timestamp;
 * clicking it seeks the player to that point, exactly like clicking a
 * transcript line does. This reuses the same `onSeek` callback the
 * TranscriptPanel uses, so both views drive the same single source of
 * truth (currentTime, owned by the MediaPlayer / parent page).
 */

import { ListTree } from "lucide-react";
import type { OutlineItem } from "@/types";
import { formatTime } from "@/lib/format";

interface OutlineTabProps {
  items: OutlineItem[];
  onSeek: (seconds: number) => void;
}

export default function OutlineTab({ items, onSeek }: OutlineTabProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-foreground-muted text-center py-8">
        No outline generated for this meeting.
      </p>
    );
  }

  return (
    <ul className="space-y-1">
      {items.map((item, idx) => (
        <li key={item.id}>
          <button
            onClick={() => onSeek(item.start_time)}
            className="w-full flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-left hover:bg-surface-sunken transition-colors group"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-md bg-accent-soft text-accent text-xs font-semibold shrink-0">
              <ListTree size={12} />
            </span>
            <span className="text-sm text-foreground group-hover:text-accent flex-1 min-w-0">
              {item.title}
            </span>
            <span className="text-xs text-foreground-muted tabular-nums shrink-0">
              {formatTime(item.start_time)}
            </span>
          </button>
          {idx < items.length - 1 && <div className="ml-[27px] h-2 border-l border-border" />}
        </li>
      ))}
    </ul>
  );
}
