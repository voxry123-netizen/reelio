"use client";
import React, { createContext, useContext, useMemo, useState } from "react";
import { ToastItem, makeToast, ToastType } from "../ui/kit/Toast";
import ToastViewport from "../ui/kit/ToastViewport";

type ToastInput = {
  kind: ToastType;
  title: string;
  message?: string;
};

type ToastApi = {
  // Suportă ambele:
  // 1) push("success", "Title", "Message")
  // 2) push({ kind: "success", title: "Title", message: "Message" })
  push: {
    (type: ToastType, title: string, message?: string): void;
    (input: ToastInput): void;
  };

  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const api = useMemo<ToastApi>(() => {
    const emit = (type: ToastType, title: string, message?: string) => {
      const t = makeToast(type, title, message);
      setItems((prev) => [t, ...prev].slice(0, 4));
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== t.id));
      }, 4200);
    };

    const push: ToastApi["push"] = (a: any, b?: any, c?: any) => {
      // push({ kind, title, message })
      if (typeof a === "object" && a?.kind && a?.title) {
        emit(a.kind as ToastType, String(a.title), a.message ? String(a.message) : undefined);
        return;
      }
      // push(type, title, message?)
      emit(a as ToastType, String(b ?? ""), c ? String(c) : undefined);
    };

    return {
      push,
      success: (title, message) => emit("success", title, message),
      error: (title, message) => emit("error", title, message),
      warning: (title, message) => emit("warning", title, message),
      info: (title, message) => emit("info", title, message),
    };
  }, []);

  return (
    <Ctx.Provider value={api}>
      {children}
      <ToastViewport
        items={items}
        onDismiss={(id) => setItems((p) => p.filter((x) => x.id !== id))}
      />
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used within ToastProvider");
  return v;
}