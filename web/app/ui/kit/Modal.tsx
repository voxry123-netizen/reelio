"use client";
import React from "react";
import { cx } from "./utils";
import { Button } from "./Button";

export function Modal({
  open,
  title,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title?: string;
  children?: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998]">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={cx(
            "w-[520px] max-w-[95vw] rounded-2xl border border-border/70 bg-card/90 backdrop-blur " +
              "shadow-[0_40px_120px_-70px_rgba(0,0,0,1)]"
          )}
        >
          <div className="flex items-center justify-between gap-4 p-5 pb-3">
            <div className="text-base font-semibold">{title ?? "Dialog"}</div>
            <button className="rounded-lg px-2 py-1 text-muted hover:bg-card/60" onClick={onClose}>
              ✕
            </button>
          </div>
          <div className="px-5 pb-5 text-sm text-muted">{children}</div>
          <div className="flex justify-end gap-2 border-t border-border/60 p-4">
            {footer ?? <Button variant="secondary" onClick={onClose}>Close</Button>}
          </div>
        </div>
      </div>
    </div>
  );
}