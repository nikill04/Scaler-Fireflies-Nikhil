"use client";

/**
 * components/ThemeToggle.tsx
 * ----------------------------
 * Bonus feature: DARK MODE.
 *
 * How it works (this is the same mental model as any React app):
 *   1. On mount, check what's currently applied to <html> (set by the
 *      no-flash script in layout.tsx) and reflect that into useState.
 *   2. When the button is clicked, toggle the `.dark` class on
 *      document.documentElement, and save the choice to localStorage so
 *      it persists across page reloads.
 *
 * Every other component in the app never needs to know about dark mode
 * directly -- they just use Tailwind classes built on our CSS variables
 * (e.g. bg-surface, text-foreground), and those variables automatically
 * repoint when `.dark` is present on <html> (see globals.css).
 */

// import { useState } from "react";
// import { Moon, Sun } from "lucide-react";

// export default function ThemeToggle() {
//   // Lazy initializer: reads the class already applied by the no-flash
//   // script in layout.tsx, synchronously on first render -- no effect
//   // needed, which avoids an extra render pass just to sync this flag.
//   const [isDark, setIsDark] = useState(
//     () => typeof document !== "undefined" && document.documentElement.classList.contains("dark")
//   );

//   function toggleTheme() {
//     const next = !isDark;
//     setIsDark(next);
//     document.documentElement.classList.toggle("dark", next);
//     localStorage.setItem("theme", next ? "dark" : "light");
//   }

//   return (
//     <button
//       onClick={toggleTheme}
//       aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
//       className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-active transition-colors w-full"
//     >
//       {isDark ? <Sun size={16} /> : <Moon size={16} />}
//       <span>{isDark ? "Light mode" : "Dark mode"}</span>
//     </button>
//   );
// }



"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export default function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-active transition-colors w-full"
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
      <span>{isDark ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
