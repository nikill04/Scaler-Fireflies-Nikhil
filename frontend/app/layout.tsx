import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Fireflies Clone | Meeting Notes & Transcription",
  description: "A meeting notes and transcription workspace, built as a Fireflies.ai clone.",
};

/**
 * This tiny inline script runs BEFORE React hydrates and BEFORE the page
 * paints. It reads the user's saved theme preference from localStorage and
 * applies the `.dark` class to <html> immediately.
 *
 * Why this matters: without it, the page would always render in light mode
 * first, then "flash" to dark mode a moment later once our React component
 * mounts and checks localStorage. Running it here, outside of React,
 * eliminates that flash entirely.
 */
const themeInitScript = `
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      var isDark = saved === 'dark' || (!saved && prefersDark);
      if (isDark) document.documentElement.classList.add('dark');
    } catch (e) {}
  })();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
