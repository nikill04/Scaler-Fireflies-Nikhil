"use client";

/**
 * components/TranscriptPanel.tsx
 * ---------------------------------
 * The core feature of the whole app: an interactive, speaker-labeled
 * transcript.
 *
 * Three behaviors implemented here:
 *   1. CLICK A LINE -> SEEK PLAYER: clicking a line calls `onSeek(startTime)`,
 *      which the parent uses to move the MediaPlayer's playhead.
 *   2. PLAYER -> HIGHLIGHT LINE: the parent passes down `currentTime`; we
 *      figure out which line's [start_time, end_time) range contains it,
 *      and visually highlight that line, auto-scrolling it into view.
 *   3. SEARCH WITHIN TRANSCRIPT: a local search box filters/highlights
 *      matching text inside the transcript (this is separate from the
 *      global search bar in the header, which searches ALL meetings).
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import type { TranscriptLine } from "@/types";
import { formatTime } from "@/lib/format";
import Avatar from "./ui/Avatar";

interface TranscriptPanelProps {
  lines: TranscriptLine[];
  currentTime: number;
  onSeek: (seconds: number) => void;
  participantAvatars: Record<string, string | null>;
}

/** Wraps matches of `query` inside `text` with a <mark> highlight. */
function highlightMatches(text: string, query: string) {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, idx) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={idx} className="bg-highlight text-foreground rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function TranscriptPanel({
  lines,
  currentTime,
  onSeek,
  participantAvatars,
}: TranscriptPanelProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const activeLineRef = useRef<HTMLDivElement>(null);

  const activeLineId = useMemo(() => {
    const active = lines.find(
      (line) => currentTime >= line.start_time && currentTime < line.end_time
    );
    return active?.id ?? null;
  }, [lines, currentTime]);

  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const lower = searchQuery.toLowerCase();
    return lines.reduce(
      (count, line) => count + (line.text.toLowerCase().includes(lower) ? 1 : 0),
      0
    );
  }, [lines, searchQuery]);

  // Auto-scroll the active (currently-playing) line into view.
  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeLineId]);

  return (
    <div className="rounded-2xl border border-border bg-surface-raised flex flex-col h-full overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-foreground">Transcript</h2>
        <div className="relative w-56">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-foreground-muted" />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search transcript..."
            className="w-full rounded-md border border-border bg-surface pl-8 pr-7 py-1.5 text-xs text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-foreground-muted hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {searchQuery && (
        <div className="px-4 py-1.5 text-[11px] text-foreground-muted bg-surface-sunken border-b border-border">
          {matchCount} match{matchCount !== 1 ? "es" : ""} for &ldquo;{searchQuery}&rdquo;
        </div>
      )}

      <div className="flex-1 overflow-y-auto thin-scrollbar p-4 space-y-3">
        {lines.length === 0 ? (
          <p className="text-sm text-foreground-muted text-center py-8">
            No transcript available for this meeting.
          </p>
        ) : (
          lines.map((line) => {
            const isActive = line.id === activeLineId;
            const isSearchMatch =
              searchQuery.trim() &&
              line.text.toLowerCase().includes(searchQuery.toLowerCase());

            return (
              <div
                key={line.id}
                ref={isActive ? activeLineRef : undefined}
                onClick={() => onSeek(line.start_time)}
                className={`flex gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                  isActive
                    ? "bg-accent-soft"
                    : isSearchMatch
                    ? "bg-highlight/20 hover:bg-highlight/30"
                    : "hover:bg-surface-sunken"
                }`}
              >
                <Avatar
                  name={line.speaker_name}
                  avatarUrl={participantAvatars[line.speaker_name] ?? null}
                  size={28}
                />
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {line.speaker_name}
                    </span>
                    <span className="text-[11px] text-foreground-muted tabular-nums">
                      {formatTime(line.start_time)}
                    </span>
                  </div>
                  <p className="text-sm text-foreground-muted leading-relaxed mt-0.5">
                    {highlightMatches(line.text, searchQuery)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
