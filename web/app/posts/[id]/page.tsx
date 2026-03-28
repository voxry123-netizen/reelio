"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { api } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";
import PostCard from "../../ui/PostCard";

export default function PostPage() {
  const toast = useToast();
  const params = useParams();
  const id = (params as any)?.id as string | undefined;
  const [item, setItem] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        const res: any = await api(`/posts/${id}`);
        setItem(res?.data?.post ?? null);
      } catch (e: any) {
        toast.push("error", "Load post failed", e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [id, toast]);

  if (loading) return <div className="rm-muted">Loading...</div>;
  if (!item) return <div className="rm-muted">Post not found.</div>;

  return <PostCard item={item} />;
}
