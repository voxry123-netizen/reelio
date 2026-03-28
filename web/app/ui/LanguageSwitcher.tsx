"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "../providers/LanguageProvider";

type LangOption = {
  value: string;
  label: string;
  flag: string;
};

const OPTIONS: LangOption[] = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "ro", label: "Română", flag: "🇷🇴" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
  { value: "pt", label: "Português", flag: "🇵🇹" },
  { value: "nl", label: "Nederlands", flag: "🇳🇱" },
  { value: "pl", label: "Polski", flag: "🇵🇱" },
  { value: "tr", label: "Türkçe", flag: "🇹🇷" },
  { value: "uk", label: "Українська", flag: "🇺🇦" },
  { value: "ru", label: "Русский", flag: "🇷🇺" },
  { value: "ar", label: "العربية", flag: "🇸🇦" },
  { value: "zh", label: "中文", flag: "🇨🇳" },
  { value: "ja", label: "日本語", flag: "🇯🇵" },
  { value: "ko", label: "한국어", flag: "🇰🇷" },
];

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const current = useMemo(
    () => OPTIONS.find((opt) => opt.value === language) ?? OPTIONS[0],
    [language]
  );

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2 text-sm text-white/90 transition hover:bg-white/[0.08]"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span>{current.flag}</span>
        <span>{current.label}</span>
      </button>

      {open ? (
        <div
          className="absolute right-0 z-[120] mt-2 max-h-80 w-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#08111f]/95 p-2 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          role="menu"
        >
          <div className="px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/45">
            {t("language")}
          </div>

          <div className="space-y-1">
            {OPTIONS.map((opt) => {
              const active = opt.value === language;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-cyan-400/15 text-cyan-200"
                      : "text-white/85 hover:bg-white/[0.06]"
                  }`}
                  onClick={() => {
                    setLanguage(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="text-base">{opt.flag}</span>
                  <span className="flex-1">{opt.label}</span>
                  {active ? <span className="text-xs text-cyan-300">✓</span> : null}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}