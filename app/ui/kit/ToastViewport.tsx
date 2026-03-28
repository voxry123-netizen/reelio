"use client";

import React from "react";
import type { ToastItem } from "./Toast";

export default function ToastViewport({
  items,
  onDismiss,
}: {
  items: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  return (
    <div className="rm-toasts" role="region" aria-label="Notifications">
      {items.map((t) => (
        <div
          key={t.id}
          className={[
            "rm-toast",
            t.type === "success" ? "rm-toast-success" : "",
            t.type === "error" ? "rm-toast-error" : "",
            t.type === "info" ? "rm-toast-info" : "",
            t.type === "warning" ? "rm-toast-warning" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <div className="rm-toast-head">
            <div className="rm-toast-title">{t.title}</div>

            <button
              type="button"
              className="rm-iconbtn"
              aria-label="Dismiss"
              onClick={() => onDismiss(t.id)}
            >
              ✕
            </button>
          </div>

          {t.message ? <div className="rm-toast-msg">{t.message}</div> : null}
        </div>
      ))}
    </div>
  );
}