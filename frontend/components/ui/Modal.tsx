"use client";

/**
 * components/ui/Modal.tsx
 * --------------------------
 * Generic modal dialog shell, reused for "Create meeting" and "Edit
 * meeting" forms. Handles:
 *   - clicking the backdrop to close
 *   - pressing Escape to close
 *   - locking body scroll while open
 *
 * The actual form content is passed in as `children` -- this component
 * only owns the overlay/positioning/close behavior, not the form itself.
 */

import { ReactNode, useEffect } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidthClassName = "max-w-lg",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClassName} max-h-[85vh] overflow-y-auto thin-scrollbar rounded-2xl bg-surface-raised border border-border shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-surface-raised">
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="text-foreground-muted hover:text-foreground rounded-md p-1"
          >
            <X size={18} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
