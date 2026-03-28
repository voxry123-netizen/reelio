"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { absoluteAssetUrl, api } from "../lib/api";
import { useLanguage } from "../providers/LanguageProvider";

export default function FollowsModal({ open, onClose, userId }: { open: boolean; onClose: () => void; userId: string }) {
  const { t } = useLanguage();
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [tab, setTab] = useState<"followers"|"following">("followers");

  useEffect(() => {
    if (!open || !userId) return;
    (async () => {
      const res: any = await api(`/users/${userId}/follows`);
      setFollowers(res?.data?.followers || []);
      setFollowing(res?.data?.following || []);
    })();
  }, [open, userId]);

  if (!open) return null;

  const items = tab === "followers" ? followers : following;
  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xl" onClick={onClose}>
      <div className="w-full max-w-xl rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,33,0.96),rgba(5,10,22,0.96))] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.5)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between"><div className="text-lg font-black text-white">{t("people")}</div><button className="navlink" onClick={onClose}>{t("close")}</button></div>
        <div className="mb-4 flex gap-2">
          <button className={`rm-action-btn rm-action-btn--sm ${tab === "followers" ? "rm-action-btn--cyan" : "rm-action-btn--ghost"}`} onClick={() => setTab("followers")}>{t("followers")}</button>
          <button className={`rm-action-btn rm-action-btn--sm ${tab === "following" ? "rm-action-btn--cyan" : "rm-action-btn--ghost"}`} onClick={() => setTab("following")}>{t("following")}</button>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {items.map((item) => {
            const avatar = absoluteAssetUrl(item.avatarUrl);
            return <Link key={item.id} href={`/profile/${item.id}`} className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3" onClick={onClose}>{avatar ? <img src={avatar} alt={item.username} className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 font-black">{(item.displayName || item.username || 'U').slice(0,1).toUpperCase()}</div>}<div><div className="text-sm font-semibold text-white">{item.displayName || item.username}</div><div className="text-xs text-white/45">@{item.username}</div></div></Link>;
          })}
          {!items.length ? <div className="rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-6 text-sm text-white/60">{t("noFollowersYet")}</div> : null}
        </div>
      </div>
    </div>
  );
}
