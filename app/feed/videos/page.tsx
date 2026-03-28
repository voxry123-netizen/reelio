
"use client";

import { useEffect, useState } from "react";
import { Card } from "../../ui/kit/Card";
import { Skeleton } from "../../ui/kit/Skeleton";
import { api, absoluteAssetUrl } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|ogv|ogg|mov)(\?|$)/i.test(url);
}

export default function FeedVideosPage() {
  const { push } = useToast();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r: any = await api("/feed/videos");
        setItems(r?.data?.items ?? []);
      } catch (e: any) {
        push({ kind: "error", title: "Videos error", message: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  return (
    <div className="rm-stack">
      <Card title="Feed / Videos" subtitle="Separate video grid for Reelio clips.">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Skeleton h={280} />
            <Skeleton h={280} />
            <Skeleton h={280} />
          </div>
        ) : items.length ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {items.map((item) => {
              const mediaUrl = absoluteAssetUrl(item?.media?.[0]?.storageKeyOriginal);
              if (!isVideoUrl(mediaUrl)) return null;
              return (
                <div key={item.id} className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 backdrop-blur">
                  <video src={mediaUrl || undefined} autoPlay muted loop playsInline preload="metadata" className="aspect-[9/16] w-full bg-black object-cover" />
                  <div className="p-4">
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm text-muted">@{item?.author?.username || "unknown"}</div>
                    {item?.caption ? <div className="mt-2 line-clamp-3 text-sm text-muted">{item.caption}</div> : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rm-muted">No videos available yet.</div>
        )}
      </Card>
    </div>
  );
}
