"use client";
import React from "react";
import { cx, uid } from "./utils";

export type ToastType = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  createdAt: number;
};

export function ToastProvider({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="fixed right-4 top-4 z-[9999] flex w-[360px] max-w-[92vw] flex-col gap-3">
      {items.map((t) => (
        <div
          key={t.id}
          className={cx(
            "rounded-2xl border backdrop-blur bg-card/85 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.9)]",
            t.type === "success" && "border-emerald-500/30",
            t.type === "error" && "border-red-500/30",
            t.type === "info" && "border-border/70"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold">{t.title}</div>
              {t.message ? <div className="mt-1 text-sm text-muted">{t.message}</div> : null}
            </div>
            <button
              className="rounded-lg px-2 py-1 text-muted hover:bg-card/60"
              onClick={() => onDismiss(t.id)}
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 h-[2px] w-full overflow-hidden rounded bg-border/40">
            <div className="h-full w-full animate-[toastbar_4s_linear_forwards] bg-foreground/70" />
          </div>
        </div>
      ))}
      <style jsx global>{`
        @keyframes toastbar {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0%);
          }
        }
      `}</style>
    </div>
  );
}

export function makeToast(type: ToastType, title: string, message?: string): ToastItem {
  return { id: uid("toast"), type, title, message, createdAt: Date.now() };
}