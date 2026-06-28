"use client";

/**
 * components/GlobalSearchBar.tsx
 * ---------------------------------
 * Bonus feature: GLOBAL SEARCH ACROSS ALL MEETINGS.
 *
 * This is distinct from the title-filter search box on the Library page
 * (that one only searches the `title` field locally via a query param).
 * This component calls the dedicated /search endpoint, which looks across
 * titles, transcript lines, summaries, AND action items, then shows a
 * dropdown of results grouped by where the match was found.
 *
 * We debounce the input (wait 300ms after the user stops typing) so we're
 * not firing a network request on every keystroke -- the same debounce
 * pattern you'd use in any React search box.
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, FileText, CheckSquare, MessageSquare, Loader2 } from "lucide-react";
import { globalSearch } from "@/lib/api";
import type { GlobalSearchResult } from "@/types";

const MATCH_TYPE_ICON: Record<GlobalSearchResult["match_type"], typeof FileText> = {
  title: FileText,
  transcript: MessageSquare,
  summary: FileText,
  action_item: CheckSquare,
};

const MATCH_TYPE_LABEL: Record<GlobalSearchResult["match_type"], string> = {
  title: "Title",
  transcript: "Transcript",
  summary: "Summary",
  action_item: "Action item",
};

export default function GlobalSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (query.trim().length === 0) {
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await globalSearch(query.trim());
        setResults(data);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (value.trim().length === 0) {
      setResults([]);
      setOpen(false);
    }
  }

  function handleResultClick(meetingId: number) {
    setOpen(false);
    setQuery("");
    router.push(`/meetings/${meetingId}`);
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted" />
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search all meetings, transcripts, action items..."
          className="w-full rounded-lg border border-border bg-surface pl-9 pr-9 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
        />
        {loading && (
          <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground-muted animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute mt-1.5 w-full rounded-xl border border-border bg-surface-raised shadow-xl max-h-96 overflow-y-auto thin-scrollbar z-30">
          {results.length === 0 ? (
            <p className="px-4 py-6 text-sm text-foreground-muted text-center">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            <>
              <p className="px-4 pt-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-foreground-muted">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </p>
              <ul className="pb-2">
                {results.map((result, idx) => {
                  const Icon = MATCH_TYPE_ICON[result.match_type];
                  return (
                    <li key={`${result.meeting_id}-${idx}`}>
                      <button
                        onClick={() => handleResultClick(result.meeting_id)}
                        className="w-full text-left px-4 py-2.5 hover:bg-surface-sunken transition-colors flex items-start gap-2.5"
                      >
                        <Icon size={15} className="text-accent mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-foreground font-medium truncate">
                            {result.meeting_title}
                          </p>
                          <p className="text-xs text-foreground-muted truncate">
                            <span className="text-accent">{MATCH_TYPE_LABEL[result.match_type]}</span>
                            {" — "}
                            {result.snippet}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  );
}
