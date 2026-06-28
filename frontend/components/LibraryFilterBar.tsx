"use client";

/**
 * components/LibraryFilterBar.tsx
 * ----------------------------------
 * The filter row above the meeting grid on the Library page. Lets the
 * user search by title, filter by tag or participant, and change sort
 * order. All of this is "controlled" -- the parent page (app/page.tsx)
 * owns the actual filter state and re-fetches meetings whenever it
 * changes; this component just renders the controls and calls the
 * `onChange` callbacks it's given.
 */

import { ArrowDownUp, Search, Tag as TagIcon, Users } from "lucide-react";
import type { Tag } from "@/types";

interface LibraryFilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  participantValue: string;
  onParticipantChange: (value: string) => void;
  tagValue: string;
  onTagChange: (value: string) => void;
  sortValue: "recent" | "oldest";
  onSortChange: (value: "recent" | "oldest") => void;
  availableTags: Tag[];
}

export default function LibraryFilterBar({
  searchValue,
  onSearchChange,
  participantValue,
  onParticipantChange,
  tagValue,
  onTagChange,
  sortValue,
  onSortChange,
  availableTags,
}: LibraryFilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Filter by meeting title..."
          className="w-full rounded-lg border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
        />
      </div>

      <div className="relative">
        <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={participantValue}
          onChange={(e) => onParticipantChange(e.target.value)}
          placeholder="Participant..."
          className="w-44 rounded-lg border border-border bg-surface-raised pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
        />
      </div>

      <div className="relative">
        <TagIcon size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted z-10" />
        <select
          value={tagValue}
          onChange={(e) => onTagChange(e.target.value)}
          className="rounded-lg border border-border bg-surface-raised pl-9 pr-7 py-2 text-sm text-foreground focus:border-accent outline-none appearance-none cursor-pointer"
        >
          <option value="">All tags</option>
          {availableTags.map((tag) => (
            <option key={tag.id} value={tag.name}>
              {tag.name}
            </option>
          ))}
        </select>
      </div>

      <div className="relative">
        <ArrowDownUp size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted z-10" />
        <select
          value={sortValue}
          onChange={(e) => onSortChange(e.target.value as "recent" | "oldest")}
          className="rounded-lg border border-border bg-surface-raised pl-9 pr-7 py-2 text-sm text-foreground focus:border-accent outline-none appearance-none cursor-pointer"
        >
          <option value="recent">Most recent</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
    </div>
  );
}
