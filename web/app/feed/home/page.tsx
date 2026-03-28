"use client";

import { useEffect, useState } from "react";
import { Card } from "../../ui/kit/Card";
import { Skeleton } from "../../ui/kit/Skeleton";
import { api } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";
import { useLanguage } from "../../providers/LanguageProvider";
import PostCard from "../../ui/PostCard";

export default function FeedHomePage() {
  const { push } = useToast();
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const r: any = await api("/feed/home");
        setItems(r?.data?.items ?? []);
      } catch (e: any) {
        push({ kind: "error", title: "Feed error", message: e.message });
      } finally {
        setLoading(false);
      }
    })();
  }, [push]);

  return (
    <div className="rm-stack">
      <Card title={t("feed") + " / Home"} subtitle={t("latestCreators")}>
        {loading ? (
          <div className="rm-stack">
            <Skeleton h={18} w="45%" />
            <Skeleton h={140} />
            <Skeleton h={140} />
          </div>
        ) : items.length ? (
          <div className="rm-stack">
            {items.map((item) => (
              <PostCard key={item.id} item={item} onDeleted={(id) => setItems((prev) => prev.filter((x) => x.id !== id))} />
            ))}
          </div>
        ) : (
          <div className="rm-muted">{t("loading")}</div>
        )}
      </Card>
    </div>
  );
}
