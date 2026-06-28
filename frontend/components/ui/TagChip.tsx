/**
 * components/ui/TagChip.tsx
 * ---------------------------
 * Small pill used to display a meeting's tags, both on the library cards
 * and the detail page header. Optionally clickable + removable (used in
 * the create/edit meeting form where you can remove a tag you just added).
 */

import { X } from "lucide-react";

interface TagChipProps {
  label: string;
  onRemove?: () => void;
  onClick?: () => void;
  active?: boolean;
}

export default function TagChip({ label, onRemove, onClick, active }: TagChipProps) {
  const Wrapper = onClick ? "button" : "span";

  return (
    <Wrapper
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-accent text-white"
          : "bg-accent-soft text-accent hover:bg-accent/20"
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      {label}
      {onRemove && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label} tag`}
          className="hover:opacity-70"
        >
          <X size={12} />
        </button>
      )}
    </Wrapper>
  );
}
