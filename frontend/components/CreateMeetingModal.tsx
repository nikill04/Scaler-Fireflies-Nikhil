"use client";

/**
 * components/CreateMeetingModal.tsx
 * -------------------------------------
 * The "New Meeting" form, opened from the Library page header.
 *
 * Supports the two creation paths the assignment asks for:
 *   1. Plain form: title + comma-separated participants + tags
 *   2. Paste/upload a transcript: a textarea (or a .txt file upload that
 *      fills the same textarea) using the format:
 *        Speaker Name [MM:SS] What they said
 *      which the backend's transcript_parser.py turns into real
 *      TranscriptLine rows.
 *
 * This is a controlled form -- every field is React state, and on submit
 * we build the MeetingCreatePayload object and call the API. Nothing here
 * should look unfamiliar coming from a plain React + REST background.
 */

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import TagChip from "./ui/TagChip";
import { createMeeting } from "@/lib/api";
import type { MeetingDetail } from "@/types";

interface CreateMeetingModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (meeting: MeetingDetail) => void;
}

const SAMPLE_TRANSCRIPT_PLACEHOLDER = `Alice [00:00] Thanks everyone for joining today.
Bob [00:14] Happy to be here, let's dive in.
Alice [00:45] First up, let's review last week's numbers...`;

export default function CreateMeetingModal({ open, onClose, onCreated }: CreateMeetingModalProps) {
  const [title, setTitle] = useState("");
  const [participantInput, setParticipantInput] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [rawTranscript, setRawTranscript] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function resetForm() {
    setTitle("");
    setParticipantInput("");
    setTagInput("");
    setTags([]);
    setRawTranscript("");
    setError(null);
  }

  function handleClose() {
    resetForm();
    onClose();
  }

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRawTranscript(String(reader.result || ""));
    };
    reader.readAsText(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please enter a meeting title.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const participantNames = participantInput
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      const created = await createMeeting({
        title: title.trim(),
        participant_names: participantNames,
        tag_names: tags,
        raw_transcript: rawTranscript.trim() || null,
      });

      onCreated(created);
      handleClose();
    } catch {
      setError("Something went wrong creating the meeting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={handleClose} title="New meeting" maxWidthClassName="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Meeting title <span className="text-danger">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Weekly Sync with Marketing"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Participants
          </label>
          <input
            value={participantInput}
            onChange={(e) => setParticipantInput(e.target.value)}
            placeholder="Comma-separated, e.g. Alice, Bob, Charlie"
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1.5">Tags</label>
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="Type a tag and press Enter"
              className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:border-accent outline-none"
            />
            <Button type="button" variant="secondary" onClick={handleAddTag}>
              Add
            </Button>
          </div>
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {tags.map((tag) => (
                <TagChip key={tag} label={tag} onRemove={() => setTags(tags.filter((t) => t !== tag))} />
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-sm font-medium text-foreground">
              Transcript (optional)
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-accent hover:underline"
            >
              <Upload size={13} /> Upload .txt file
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
          <textarea
            value={rawTranscript}
            onChange={(e) => setRawTranscript(e.target.value)}
            placeholder={SAMPLE_TRANSCRIPT_PLACEHOLDER}
            rows={6}
            className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted/60 focus:border-accent outline-none font-mono"
          />
          <p className="text-xs text-foreground-muted mt-1">
            Format: <code className="text-accent">Speaker Name [MM:SS] What they said</code>, one line per turn.
          </p>
        </div>

        {error && <p className="text-sm text-danger">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Creating..." : "Create meeting"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
