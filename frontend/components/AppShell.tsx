"use client";

/**
 * components/AppShell.tsx
 * --------------------------
 * Combines the persistent Sidebar with the ToastProvider and wraps
 * whatever page content is passed in as children. Used once, in
 * app/layout.tsx, so every page automatically gets the sidebar + toasts
 * without each page needing to set that up itself.
 */

import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import ToastProvider from "./ToastProvider";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex min-h-screen bg-surface-sunken">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </ToastProvider>
  );
}
