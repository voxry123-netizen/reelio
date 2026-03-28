"use client";
import React from "react";
import { cx } from "./utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

export function Button({
  variant = "primary",
  size = "md",
  className,
  leftIcon,
  rightIcon,
  loading,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  loading?: boolean;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-medium transition will-change-transform " +
    "focus:outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-50 disabled:cursor-not-allowed " +
    "active:scale-[0.98]";

  const sizes: Record<Size, string> = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-[15px]",
  };

  const variants: Record<Variant, string> = {
    primary:
      "bg-foreground text-background shadow-[0_10px_30px_-12px_rgba(0,0,0,0.5)] " +
      "hover:translate-y-[-1px] hover:shadow-[0_14px_40px_-14px_rgba(0,0,0,0.6)]",
    secondary:
      "bg-card text-foreground border border-border/70 hover:bg-card/70 hover:border-border",
    ghost: "bg-transparent text-foreground hover:bg-card/60",
    danger:
      "bg-red-600 text-white hover:bg-red-500 shadow-[0_10px_30px_-12px_rgba(239,68,68,0.6)]",
  };

  return (
    <button
      className={cx(base, sizes[size], variants[variant], className)}
      {...props}
      disabled={props.disabled || loading}
    >
      {loading ? (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
      ) : (
        leftIcon ?? null
      )}
      <span>{props.children}</span>
      {rightIcon ?? null}
    </button>
  );
}