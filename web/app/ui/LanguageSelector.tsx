"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../providers/LanguageProvider";

export default function LanguageSelector() {
  const { language, setLanguage, options, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const current = options.find((opt) => opt.value === language) || options[0];

  return (
    <div ref={ref} className="relative">
      <button type="button" className="navlink rounded-full border border-border/60 bg-card/40 px-3 py-2" onClick={() => setOpen((v) => !v)}>
        <span className="mr-2">{current.flag}</span>{current.label}
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-[80] mt-2 max-h-80 w-64 overflow-y-auto rounded-2xl border border-border/70 bg-card/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("language")}</div>
          <div className="space-y-1">
            {options.map((opt) => (
              <button key={opt.value} type="button" className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm ${opt.value === language ? "bg-white/10 text-white" : "hover:bg-white/[0.05]"}`} onClick={() => { setLanguage(opt.value); setOpen(false); }}>
                <span><span className="mr-2">{opt.flag}</span>{opt.label}</span>
                {opt.value === language ? <span>✓</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
