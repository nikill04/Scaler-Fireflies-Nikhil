/**
 * components/ui/Button.tsx
 * ---------------------------
 * One Button component with a small set of variants, so every button in
 * the app looks consistent without copy-pasting className strings
 * everywhere. This is a thin wrapper around a normal <button>, so all
 * standard props (onClick, disabled, type, etc.) just pass through.
 */

import { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-accent-hover",
  secondary: "bg-surface-sunken text-foreground border border-border hover:bg-border/40",
  danger: "bg-danger-soft text-danger hover:bg-danger/20",
  ghost: "text-foreground-muted hover:text-foreground hover:bg-surface-sunken",
};

export default function Button({
  variant = "primary",
  children,
  className = "",
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
