"use client";

/**
 * components/EditMeetingModal.tsx
 * -----------------------------------
 * Lets the user edit a meeting's metadata: title, participants, tags.
 * This intentionally does NOT let you edit the transcript itself (that's
 * out of scope per the assignment, which only asks for editing metadata).
 *
 * Pre-fills its fields from the current meeting every time it's opened.
 * Rather than using a useEffect to "reset" state when `open` changes
 * (which fights against React's data flow), we give the inner form a
 * `key` that changes whenever the modal opens. React treats a key change
 * as "this is a new component instance" and remounts it from scratch,
 * which naturally re-runs the useState initializers with fresh values --
 * no synchronization effect required.
 */

import { useState } from "react";
import Modal from "./ui/Modal";
import Button from "./ui/Button";
import TagChip from "./ui/TagChip";
import { updateMeeting } from "@/lib/api";
import type { MeetingDetail } from "@/types";

interface EditMeetingModalProps {
  open: boolean;
  onClose: () => void;
  meeting: MeetingDetail;
  onUpdated: (meeting: MeetingDetail) => void;
}

export default function EditMeetingModal({ open, onClose, meeting, onUpdated }: EditMeetingModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Edit meeting">
      {/* Remounts (and so resets all its internal state) every time the
          modal is opened, because the key changes. */}
      <EditMeetingForm
        key={open ? `open-${meeting.id}` : "closed"}
        meeting={meeting}
        onClose={onClose}
        onUpdated={onUpdated}
      />
    </Modal>
  );
}

interface EditMeetingFormProps {
  meeting: MeetingDetail;
  onClose: () => void;
  onUpdated: (meeting: MeetingDetail) => void;
}

function EditMeetingForm({ meeting, onClose, onUpdated }: EditMeetingFormProps) {
  const [title, setTitle] = useState(meeting.title);
  const [participantInput, setParticipantInput] = useState(
    meeting.participants.map((p) => p.name).join(", ")
  );
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(meeting.meeting_tags.map((mt) => mt.tag.name));
  const [submitting, setSubmitting] = useState(false);

  function handleAddTag() {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
    }
    setTagInput("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const participantNames = participantInput
        .split(",")
        .map((name) => name.trim())
        .filter(Boolean);

      const updated = await updateMeeting(meeting.id, {
        title: title.trim(),
        participant_names: participantNames,
        tag_names: tags,
      });
      onUpdated(updated);
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Title</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent outline-none"
          autoFocus
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1.5">Participants</label>
        <input
          value={participantInput}
          onChange={(e) => setParticipantInput(e.target.value)}
          placeholder="Comma-separated names"
          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent outline-none"
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
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-accent outline-none"
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

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
