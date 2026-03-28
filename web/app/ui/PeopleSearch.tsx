"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { absoluteAssetUrl, api } from "../lib/api";
import { useLanguage } from "../providers/LanguageProvider";

export default function PeopleSearch() {
  const { t } = useLanguage();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    if (!q.trim()) {
      setItems([]);
      return;
    }
    const id = setTimeout(async () => {
      try {
        setLoading(true);
        const res: any = await api(`/users/search?q=${encodeURIComponent(q.trim())}&limit=8`);
        setItems(res?.data?.items || []);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => clearTimeout(id);
  }, [q]);

  return (
    <div ref={ref} className="relative hidden lg:block">
      <input
        className="w-64 rounded-full border border-border/60 bg-card/45 px-4 py-2 text-sm outline-none placeholder:text-white/35"
        placeholder={t("searchPeoplePlaceholder")}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open ? (
        <div className="absolute left-0 top-[calc(100%+10px)] z-[85] w-full rounded-2xl border border-border/60 bg-card/95 p-2 shadow-2xl backdrop-blur-xl">
          <div className="px-2 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">{t("searchPeople")}</div>
          {loading ? <div className="px-3 py-3 text-sm text-white/60">{t("loading")}</div> : null}
          {!loading && items.length === 0 && q.trim() ? <div className="px-3 py-3 text-sm text-white/60">{t("noMatches")}</div> : null}
          {!q.trim() ? <div className="px-3 py-3 text-sm text-white/45">{t("searchPeople")}</div> : null}
          <div className="space-y-1">
            {items.map((item) => {
              const avatar = absoluteAssetUrl(item.avatarUrl);
              return (
                <Link key={item.id} href={`/profile/${item.id}`} className="flex items-center gap-3 rounded-xl px-3 py-2 hover:bg-white/5" onClick={() => setOpen(false)}>
                  {avatar ? <img src={avatar} alt={item.username} className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-white/10 font-black">{(item.displayName || item.username || "U").slice(0,1).toUpperCase()}</div>}
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-white">{item.displayName || item.username}</div>
                    <div className="truncate text-xs text-white/45">@{item.username}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
