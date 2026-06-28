"use client";

/**
 * components/ToastProvider.tsx
 * -------------------------------
 * A small toast notification system, built with plain React Context --
 * the same pattern you'd use in any React app (a Provider + a custom hook),
 * no extra library needed.
 *
 * Usage from any component:
 *   const { showToast } = useToast();
 *   showToast("Meeting deleted", "success");
 *
 * How it fits together:
 *   1. <ToastProvider> wraps the whole app (see app/layout root usage in
 *      AppShell.tsx) and holds the list of currently visible toasts in state.
 *   2. `showToast()` adds a new toast to that list and schedules its own
 *      removal a few seconds later via setTimeout.
 *   3. The toasts are rendered in a fixed-position container, stacked.
 */

import {
  createContext,
  useCallback,
  useContext,
  useState,
  ReactNode,
} from "react";
import { CheckCircle2, XCircle, Info } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

const VARIANT_STYLES: Record<ToastVariant, string> = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-accent/30 bg-accent-soft text-accent",
};

const VARIANT_ICON: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

let nextToastId = 1;

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = nextToastId++;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((t) => t.id !== id));
    }, 3500);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 w-[min(360px,90vw)]">
        {toasts.map((toast) => {
          const Icon = VARIANT_ICON[toast.variant];
          return (
            <div
              key={toast.id}
              role="status"
              className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-lg backdrop-blur-sm bg-surface-raised ${VARIANT_STYLES[toast.variant]} animate-in`}
              style={{
                animation: "toast-in 0.2s ease-out",
              }}
            >
              <Icon size={18} className="shrink-0 mt-0.5" />
              <span className="text-foreground">{toast.message}</span>
            </div>
          );
        })}
      </div>
      <style jsx global>{`
        @keyframes toast-in {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
