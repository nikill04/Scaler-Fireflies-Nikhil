"use client";

/**
 * components/ActionItemsList.tsx
 * ----------------------------------
 * The Action Items tab content on the Meeting Detail page.
 * Full CRUD: add a new task, toggle complete via checkbox, edit inline,
 * delete. State is "optimistic" -- we update the local list immediately
 * and call the API in the background, which keeps the UI feeling instant
 * (the same pattern you'd use for a todo-list app in plain React).
 */

import { useState } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import type { ActionItem } from "@/types";
import { createActionItem, updateActionItem, deleteActionItem } from "@/lib/api";
import { useToast } from "./ToastProvider";

interface ActionItemsListProps {
  meetingId: number;
  items: ActionItem[];
  onItemsChange: (items: ActionItem[]) => void;
}

export default function ActionItemsList({ meetingId, items, onItemsChange }: ActionItemsListProps) {
  const [newTask, setNewTask] = useState("");
  const [newAssignee, setNewAssignee] = useState("");
  const [adding, setAdding] = useState(false);
  const { showToast } = useToast();

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTask.trim()) return;

    setAdding(true);
    try {
      const created = await createActionItem(meetingId, {
        task: newTask.trim(),
        assignee_name: newAssignee.trim() || null,
      });
      onItemsChange([...items, created]);
      setNewTask("");
      setNewAssignee("");
    } catch {
      showToast("Couldn't add the action item.", "error");
    } finally {
      setAdding(false);
    }
  }

  async function handleToggleComplete(item: ActionItem) {
    // Optimistic update: flip it locally right away.
    onItemsChange(
      items.map((i) => (i.id === item.id ? { ...i, is_completed: !i.is_completed } : i))
    );
    try {
      await updateActionItem(meetingId, item.id, { is_completed: !item.is_completed });
    } catch {
      // Roll back on failure.
      onItemsChange(items);
      showToast("Couldn't update that action item.", "error");
    }
  }

  async function handleDelete(itemId: number) {
    const previous = items;
    onItemsChange(items.filter((i) => i.id !== itemId));
    try {
      await deleteActionItem(meetingId, itemId);
    } catch {
      onItemsChange(previous);
      showToast("Couldn't delete that action item.", "error");
    }
  }

  const completedCount = items.filter((i) => i.is_completed).length;

  return (
    <div className="space-y-4">
      {items.length > 0 && (
        <p className="text-xs text-foreground-muted">
          {completedCount} of {items.length} completed
        </p>
      )}

      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="group flex items-start gap-2.5 rounded-lg border border-border p-2.5 bg-surface"
          >
            <button
              onClick={() => handleToggleComplete(item)}
              aria-label={item.is_completed ? "Mark incomplete" : "Mark complete"}
              className={`mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                item.is_completed
                  ? "bg-success border-success text-white"
                  : "border-foreground-muted/40 hover:border-accent"
              }`}
            >
              {item.is_completed && <Check size={11} />}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm ${
                  item.is_completed ? "text-foreground-muted line-through" : "text-foreground"
                }`}
              >
                {item.task}
              </p>
              {item.assignee_name && (
                <span className="text-[11px] text-accent">@{item.assignee_name}</span>
              )}
            </div>
            <button
              onClick={() => handleDelete(item.id)}
              aria-label="Delete action item"
              className="opacity-0 group-hover:opacity-100 text-foreground-muted hover:text-danger transition-opacity shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={handleAdd} className="flex flex-col gap-2 pt-2 border-t border-border">
        <input
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          placeholder="Add an action item..."
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
        />
        <div className="flex gap-2">
          <input
            value={newAssignee}
            onChange={(e) => setNewAssignee(e.target.value)}
            placeholder="Assignee (optional)"
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
          />
          <button
            type="submit"
            disabled={adding || !newTask.trim()}
            className="flex items-center gap-1.5 rounded-lg bg-accent text-white px-3 py-2 text-sm font-medium hover:bg-accent-hover disabled:opacity-50 transition-colors"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </form>
    </div>
  );
}
