"use client";

/**
 * components/NotesPanel.tsx
 * ----------------------------
 * The right-hand panel on the Meeting Detail page, with three tabs:
 * Summary, Action Items, Outline. This is plain React tab-switching --
 * one piece of state (`activeTab`) decides which child component renders,
 * no router/URL involvement needed since these are sub-views of one page.
 */

import { useState } from "react";
import { FileText, CheckSquare, ListTree } from "lucide-react";
import type { Summary, ActionItem, OutlineItem } from "@/types";
import SummaryTab from "./SummaryTab";
import ActionItemsList from "./ActionItemsList";
import OutlineTab from "./OutlineTab";

type TabKey = "summary" | "actions" | "outline";

interface NotesPanelProps {
  meetingId: number;
  summary: Summary | null;
  onSummaryChange: (summary: Summary) => void;
  actionItems: ActionItem[];
  onActionItemsChange: (items: ActionItem[]) => void;
  outlineItems: OutlineItem[];
  onSeek: (seconds: number) => void;
  hasTranscript: boolean;
}

const TABS: { key: TabKey; label: string; icon: typeof FileText }[] = [
  { key: "summary", label: "Summary", icon: FileText },
  { key: "actions", label: "Action Items", icon: CheckSquare },
  { key: "outline", label: "Outline", icon: ListTree },
];

export default function NotesPanel({
  meetingId,
  summary,
  onSummaryChange,
  actionItems,
  onActionItemsChange,
  outlineItems,
  onSeek,
  hasTranscript,
}: NotesPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("summary");

  return (
    <div className="rounded-2xl border border-border bg-surface-raised flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs font-medium transition-colors relative ${
              activeTab === key
                ? "text-accent"
                : "text-foreground-muted hover:text-foreground"
            }`}
          >
            <Icon size={14} />
            {label}
            {key === "actions" && actionItems.length > 0 && (
              <span className="text-[10px] bg-surface-sunken rounded-full px-1.5">
                {actionItems.filter((i) => !i.is_completed).length}
              </span>
            )}
            {activeTab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent" />
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto thin-scrollbar p-4">
        {activeTab === "summary" && (
          <SummaryTab
            meetingId={meetingId}
            summary={summary}
            onSummaryChange={onSummaryChange}
            hasTranscript={hasTranscript}
          />
        )}
        {activeTab === "actions" && (
          <ActionItemsList
            meetingId={meetingId}
            items={actionItems}
            onItemsChange={onActionItemsChange}
          />
        )}
        {activeTab === "outline" && <OutlineTab items={outlineItems} onSeek={onSeek} />}
      </div>
    </div>
  );
}
