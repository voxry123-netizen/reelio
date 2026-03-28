"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Card } from "../ui/kit/Card";
import { Skeleton } from "../ui/kit/Skeleton";
import { api, apiPost, absoluteAssetUrl } from "../lib/api";
import { useToast } from "../providers/ToastProvider";
import { useLanguage } from "../providers/LanguageProvider";

function messageFor(item: any) {
  const actor = item?.actor?.displayName || item?.actor?.username || "Someone";
  switch (item?.type) {
    case "follow": return `${actor} started following you.`;
    case "like": return `${actor} reacted to your post.`;
    case "comment": return `${actor} commented on your post.`;
    case "reply": return `${actor} replied in your comment thread.`;
    case "message": return `${actor} sent you a private message.`;
    default: return `${actor} sent you a notification.`;
  }
}

function targetHref(item: any) {
  const payload = item?.payloadJson || {};
  if (item?.type === "message" && payload?.conversationId) return `/messages?conversation=${payload.conversationId}`;
  if (payload?.postId) return `/posts/${payload.postId}`;
  if (payload?.fromUserId) return `/profile/${payload.fromUserId}`;
  return "/notifications";
}

export default function NotificationsPage() {
  const { push } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const res: any = await api("/notifications");
      setItems(res?.data?.items || []);
      setUnreadCount(Number(res?.data?.unreadCount || 0));
    } catch (e: any) {
      push("error", "Notifications", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  return (
    <div className="rm-stack">
      <Card title={t("notifications")} subtitle={t("notifications")}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="rm-muted">{unreadCount} {t("unread")}</div>
          <button className="rm-action-btn rm-action-btn--ghost" onClick={async () => { await apiPost("/notifications/read-all", {}); await load(); }}>
            {t("markAllRead")}
          </button>
        </div>
        {loading ? (
          <div className="rm-stack">
            <Skeleton h={88} />
            <Skeleton h={88} />
            <Skeleton h={88} />
          </div>
        ) : items.length ? (
          <div className="rm-stack">
            {items.map((item) => {
              const avatar = absoluteAssetUrl(item?.actor?.avatarUrl);
              return (
                <Link
                  key={item.id}
                  href={targetHref(item)}
                  className={`flex items-center gap-4 rounded-[22px] border px-4 py-4 transition hover:-translate-y-[1px] ${item.readAt ? "border-white/8 bg-white/[0.03]" : "border-cyan-400/20 bg-cyan-400/8 shadow-[0_18px_40px_rgba(20,180,255,0.10)]"}`}
                  onClick={async () => {
                    if (!item.readAt) {
                      await apiPost(`/notifications/${item.id}/read`, {});
                      setItems((prev) => prev.map((x) => x.id === item.id ? { ...x, readAt: new Date().toISOString() } : x));
                      setUnreadCount((v) => Math.max(0, v - 1));
                    }
                  }}
                >
                  {avatar ? <img src={avatar} alt="actor" className="h-12 w-12 rounded-full object-cover" /> : <div className="grid h-12 w-12 place-items-center rounded-full bg-white/10 font-black">{(item?.actor?.username || "R").slice(0,1).toUpperCase()}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-white/92">{messageFor(item)}</div>
                    <div className="mt-1 text-xs text-white/45">{new Date(item.createdAt).toLocaleString()}</div>
                  </div>
                  {!item.readAt ? <div className="h-2.5 w-2.5 rounded-full bg-cyan-300" /> : null}
                </Link>
              );
            })}
          </div>
        ) : <div className="rm-muted">{t("noNotifications")}</div>}
      </Card>
    </div>
  );
}
