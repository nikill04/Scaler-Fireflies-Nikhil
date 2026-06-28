"use client";

/**
 * components/SummaryTab.tsx
 * ----------------------------
 * The "Notes" / Summary tab content. Shows the AI-generated overview +
 * key point bullets, plus two bonus actions:
 *   - Export (downloads the summary as .md or .txt via the backend route)
 *   - Generate AI Summary (calls the optional /generate-summary endpoint,
 *     which makes a REAL Groq LLM call against this meeting's transcript --
 *     see backend/app/routers/ai.py for why this is separate from seeding)
 */

import { useState } from "react";
import { Download, Sparkles, Loader2 } from "lucide-react";
import type { Summary } from "@/types";
import { generateSummary, getExportSummaryUrl } from "@/lib/api";
import { useToast } from "./ToastProvider";

interface SummaryTabProps {
  meetingId: number;
  summary: Summary | null;
  onSummaryChange: (summary: Summary) => void;
  hasTranscript: boolean;
}

export default function SummaryTab({
  meetingId,
  summary,
  onSummaryChange,
  hasTranscript,
}: SummaryTabProps) {
  const [generating, setGenerating] = useState(false);
  const { showToast } = useToast();

  async function handleGenerate() {
    setGenerating(true);
    try {
      const newSummary = await generateSummary(meetingId);
      onSummaryChange(newSummary);
      showToast("Summary regenerated from transcript", "success");
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes("503")
          ? "AI generation isn't configured on this server (missing GROQ_API_KEY)."
          : "Couldn't generate a summary right now.";
      showToast(message, "error");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">Overview</h3>
        <div className="flex items-center gap-1.5">
          <a
            href={getExportSummaryUrl(meetingId, "md")}
            className="flex items-center gap-1 text-xs text-foreground-muted hover:text-accent px-2 py-1 rounded-md hover:bg-surface-sunken transition-colors"
          >
            <Download size={12} /> .md
          </a>
          <a
            href={getExportSummaryUrl(meetingId, "txt")}
            className="flex items-center gap-1 text-xs text-foreground-muted hover:text-accent px-2 py-1 rounded-md hover:bg-surface-sunken transition-colors"
          >
            <Download size={12} /> .txt
          </a>
        </div>
      </div>

      <p className="text-sm text-foreground-muted leading-relaxed">
        {summary?.overview || "No summary yet."}
      </p>

      {summary && summary.key_points.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-2">Key Points</h3>
          <ul className="space-y-2">
            {summary.key_points.map((point) => (
              <li key={point.id} className="flex gap-2 text-sm text-foreground-muted leading-relaxed">
                <span className="text-accent mt-1.5 w-1 h-1 rounded-full bg-accent shrink-0" />
                {point.text}
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={handleGenerate}
        disabled={generating || !hasTranscript}
        title={!hasTranscript ? "This meeting has no transcript to summarize" : undefined}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-accent/30 bg-accent-soft text-accent px-3 py-2.5 text-sm font-medium hover:bg-accent/20 disabled:opacity-50 transition-colors"
      >
        {generating ? (
          <>
            <Loader2 size={15} className="animate-spin" /> Generating with AI...
          </>
        ) : (
          <>
            <Sparkles size={15} /> Generate AI Summary
          </>
        )}
      </button>
      <p className="text-[11px] text-foreground-muted text-center -mt-2">
        Uses a live LLM call against this meeting&apos;s transcript.
      </p>
    </div>
  );
}
