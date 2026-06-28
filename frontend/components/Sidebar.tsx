"use client";

/**
 * components/Sidebar.tsx
 * -------------------------
 * The dark left-hand navigation rail, present on every page. This is the
 * single biggest visual signal that makes the app "feel like Fireflies" --
 * their product always has this dark sidebar with a violet active-state
 * highlight, regardless of which page you're on.
 *
 * Nav items below "Library" are PLACEHOLDERS per the assignment's
 * "Mocked / Placeholder Sections" list (integrations, team, settings) --
 * clicking them just shows a "Coming soon" toast instead of navigating
 * anywhere, which is an honest way to represent "not implemented" without
 * a dead link or a missing page.
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  LayoutGrid,
  Bell,
  Users,
  Plug,
  Settings,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useToast } from "./ToastProvider";
import { getInitials } from "@/lib/format";

const PLACEHOLDER_ITEMS = [
  { label: "Notifications", icon: Bell },
  { label: "Team", icon: Users },
  { label: "Integrations", icon: Plug },
  { label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { showToast } = useToast();
  const isLibraryActive = pathname === "/" || pathname.startsWith("/meetings");

  return (
    <aside className="w-60 shrink-0 h-screen sticky top-0 bg-sidebar text-sidebar-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-accent text-white">
          <Sparkles size={18} />
        </div>
        <span className="font-semibold text-white text-[15px] tracking-tight">
          Fireflies<span className="text-accent">.clone</span>
        </span>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5">
        <Link
          href="/"
          className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors ${
            isLibraryActive
              ? "bg-sidebar-active text-white"
              : "hover:bg-sidebar-active hover:text-white"
          }`}
        >
          <LayoutGrid size={17} />
          <span>Meetings Library</span>
        </Link>

        <div className="pt-3 pb-1 px-3">
          <span className="text-[11px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
            Workspace
          </span>
        </div>

        {PLACEHOLDER_ITEMS.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => showToast(`${label} is coming soon`, "info")}
            className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-sidebar-active hover:text-white transition-colors text-left"
          >
            <Icon size={17} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* Theme toggle + user footer */}
      <div className="px-3 pb-3 space-y-1 border-t border-white/5 pt-3">
        <ThemeToggle />
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2.5 mt-1">
          <div className="flex items-center justify-center w-7 h-7 rounded-full bg-accent/20 text-accent text-xs font-semibold shrink-0">
            {getInitials("Nikhil Vasireddy")}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] text-white truncate leading-tight">Nikhil Vasireddy</p>
            <p className="text-[11px] text-sidebar-foreground/50 truncate leading-tight">Host</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
