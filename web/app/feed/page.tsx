"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../lib/api";


export default function FeedPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api("/feed/home?limit=20");
        setData(res);
      } catch (e: any) {
        setData({ ok: false, error: { message: e?.message ?? String(e) } });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const items = data?.data?.items ?? [];

  return (
    <div className="rm-stack">
      <div className="rm-hero2">
        <div className="rm-hero2-title">
          Home <span>Feed</span>
        </div>
        <div className="rm-hero2-sub">Latest posts from your world.</div>
      </div>

      {loading && <div className="rm-muted">Loading…</div>}

      {!loading && data && (
        <pre className="rm-pre">{JSON.stringify(data, null, 2)}</pre>
      )}

      <div className="rm-stack">
        {items.map((p: any) => (
          <Link
            key={p.id}
            href={`/posts/${p.id}`}
            className="rm-card rm-soft"
            style={{ textDecoration: "none" }}
          >
            <div className="rm-card-body">
              <div style={{ fontWeight: 950 }}>{p.title ?? "(no title)"}</div>
              <div className="rm-muted" style={{ fontSize: 12, marginTop: 6 }}>
                {p.author?.username ?? "unknown"} •{" "}
                {p.createdAt ? new Date(p.createdAt).toLocaleString() : ""}
              </div>
            </div>
          </Link>
        ))}

        {!loading && items.length === 0 && (
          <div className="rm-muted">No posts yet.</div>
        )}
      </div>
    </div>
  );
}