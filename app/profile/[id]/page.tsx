
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "../../ui/kit/Card";
import PostCard from "../../ui/PostCard";
import { api, absoluteAssetUrl } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";

export default function PublicProfilePage() {
  const params = useParams();
  const { push } = useToast();
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const id = String(params?.id || "");
        const [u, p]: any = await Promise.all([api(`/users/${id}`), api(`/users/${id}/posts`)]);
        setUser(u?.data?.user || null);
        setPosts(p?.data?.items || []);
      } catch (e:any) {
        push('error','Profile load failed', e?.message ?? String(e));
      }
    })();
  }, [params, push]);

  if (!user) return <div className="rm-muted">Loading profile...</div>;

  const avatar = absoluteAssetUrl(user?.avatarUrl);

  return (
    <div className="rm-stack">
      <Card>
        <div className="flex items-center gap-4">
          {avatar ? <img src={avatar} alt={user.username} className="h-24 w-24 rounded-full object-cover border border-border/70" style={{ objectPosition: `${user?.profile?.avatarFocusX ?? 50}% ${user?.profile?.avatarFocusY ?? 50}%` }} /> : <div className="grid h-24 w-24 place-items-center rounded-full bg-foreground text-background text-3xl font-black">{(user.username || 'U').slice(0,1).toUpperCase()}</div>}
          <div>
            <div className="text-2xl font-semibold">{user.displayName || user.username}</div>
            <div className="text-sm text-muted">@{user.username}</div>
            {user?.profile?.bio ? <div className="text-sm text-muted mt-1">{user.profile.bio}</div> : null}
          </div>
        </div>
      </Card>

      <Card title="Personal details">
        <div className="grid gap-4 md:grid-cols-2">
          <Info label="From" value={user?.profile?.origin} />
          <Info label="Works at" value={user?.profile?.work} />
          <Info label="Studies" value={user?.profile?.studies} />
          <Info label="Activities" value={Array.isArray(user?.profile?.activities) ? user.profile.activities.join(', ') : null} />
        </div>
      </Card>

      <Card title="Posts">
        <div className="rm-stack">
          {posts.map((item) => <PostCard key={item.id} item={item} />)}
        </div>
      </Card>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-2 text-sm">{value || 'Hidden'}</div>
    </div>
  );
}
