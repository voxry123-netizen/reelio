"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card } from "../../ui/kit/Card";
import PostCard from "../../ui/PostCard";
import { api, apiDelete, apiPost, absoluteAssetUrl } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";
import { useAuth } from "../../providers/AuthProvider";

function avatarVisualStyle(profile: any): CSSProperties {
  return {
    objectPosition: `${profile?.avatarFocusX ?? 50}% ${profile?.avatarFocusY ?? 50}%`,
    transform: `scale(${profile?.avatarZoom ?? 1})`,
    filter: profile?.avatarFilter || "none",
  };
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] px-4 py-3">
      <div className="text-xl font-black text-white">{value}</div>
      <div className="text-xs uppercase tracking-[0.18em] text-white/45">{label}</div>
    </div>
  );
}

function Info({
  label,
  value,
  hiddenText = "Hidden",
}: {
  label: string;
  value: string | null | undefined;
  hiddenText?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-white/45">{label}</div>
      <div className="mt-2 text-sm text-white/90">{value || hiddenText}</div>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: me } = useAuth();
  const { push } = useToast();

  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [likedPosts, setLikedPosts] = useState<any[]>([]);
  const [tab, setTab] = useState<"posts" | "videos" | "about" | "likes">("posts");
  const [working, setWorking] = useState(false);

  async function load() {
    const id = String(params?.id || "");

    const [u, p, likes]: any = await Promise.all([
      api(`/users/${id}`),
      api(`/users/${id}/posts`),
      api(`/users/${id}/likes`).catch(() => ({ data: { items: [] } })),
    ]);

    setUser(u?.data?.user || null);
    setPosts(p?.data?.items || []);
    setLikedPosts(likes?.data?.items || []);
  }

  useEffect(() => {
    void load().catch((e: any) => {
      push("error", "Profile load failed", e?.message ?? String(e));
    });
  }, [params?.id]);

  const avatar = absoluteAssetUrl(user?.avatarUrl);
  const cover = absoluteAssetUrl(user?.profile?.coverUrl);
  const isSelf = Boolean(me?.id && user?.id === me.id);

  const videoPosts = useMemo(() => {
    return posts.filter((p) =>
      (p?.media || []).some((m: any) =>
        /\.(mp4|webm|ogg|mov)(\?|$)/i.test(String(m?.storageKeyOriginal || ""))
      )
    );
  }, [posts]);

  if (!user) {
    return <div className="rm-muted">Loading profile...</div>;
  }

  const activitiesValue = Array.isArray(user?.profile?.activities)
    ? user.profile.activities.join(", ")
    : null;

  return (
    <div className="rm-stack">
      <Card className="overflow-hidden">
        <div className="relative -m-5 mb-0">
          <div className="h-48 w-full bg-[radial-gradient(circle_at_top_left,rgba(125,90,255,0.35),transparent_40%),radial-gradient(circle_at_top_right,rgba(0,196,255,0.18),transparent_35%),linear-gradient(135deg,rgba(17,23,53,0.98),rgba(5,13,25,0.94))]">
            {cover ? (
              <img
                src={cover}
                alt="cover"
                className="h-full w-full object-cover opacity-80"
              />
            ) : null}
          </div>

          <div className="absolute inset-0 bg-gradient-to-t from-[rgba(2,7,20,0.96)] via-transparent to-transparent" />

          <div className="absolute bottom-0 left-0 right-0 flex flex-col gap-4 p-6 md:flex-row md:items-end md:justify-between">
            <div className="flex items-end gap-4">
              {avatar ? (
                <div className="h-28 w-28 overflow-hidden rounded-full border-4 border-[#07111f] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
                  <img
                    src={avatar}
                    alt={user.username}
                    className="h-28 w-28 rounded-full object-cover"
                    style={avatarVisualStyle(user?.profile)}
                  />
                </div>
              ) : (
                <div className="grid h-28 w-28 place-items-center rounded-full bg-white text-4xl font-black text-black">
                  {(user.username || "U").slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="pb-2">
                <div className="text-3xl font-black text-white">
                  {user.displayName || user.username}
                </div>
                <div className="mt-1 text-sm text-white/60">@{user.username}</div>
                {user?.profile?.bio ? (
                  <div className="mt-2 max-w-2xl text-sm text-white/82">
                    {user.profile.bio}
                  </div>
                ) : null}
              </div>
            </div>

            {!isSelf ? (
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  className={`rm-action-btn ${
                    user?.stats?.viewerFollows
                      ? "rm-action-btn--ghost"
                      : "rm-action-btn--cyan"
                  }`}
                  disabled={working}
                  onClick={async () => {
                    try {
                      setWorking(true);

                      if (user?.stats?.viewerFollows) {
                        await apiDelete(`/follows/${user.id}`);
                      } else {
                        await apiPost(`/follows/${user.id}`, {});
                      }

                      await load();
                    } catch (e: any) {
                      push("error", "Follow action failed", e?.message ?? String(e));
                    } finally {
                      setWorking(false);
                    }
                  }}
                >
                  {user?.stats?.viewerFollows ? "Following" : "Follow"}
                </button>

                <button
                  type="button"
                  className="rm-action-btn rm-action-btn--ghost"
                  onClick={async () => {
                    try {
                      const res: any = await apiPost("/messages/start", {
                        targetUserId: user.id,
                      });
                      router.push(`/messages?conversation=${res?.data?.conversationId}`);
                    } catch (e: any) {
                      push("error", "Message failed", e?.message ?? String(e));
                    }
                  }}
                >
                  Message
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-4">
          <Stat label="posts" value={user?.stats?.postsCount || 0} />
          <Stat label="followers" value={user?.stats?.followersCount || 0} />
          <Stat label="following" value={user?.stats?.followingCount || 0} />
          <Stat label="likes" value={user?.stats?.likesReceived || 0} />
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {[
          ["posts", `Posts (${posts.length})`],
          ["videos", `Videos (${videoPosts.length})`],
          ["about", "About"],
          ["likes", `Likes (${likedPosts.length})`],
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rm-action-btn ${
              tab === key ? "rm-action-btn--cyan" : "rm-action-btn--ghost"
            }`}
            onClick={() => setTab(key as "posts" | "videos" | "about" | "likes")}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "about" ? (
        <Card title="About this creator" subtitle="Public profile details with privacy respected.">
          <div className="grid gap-4 md:grid-cols-2">
            <Info label="From" value={user?.profile?.origin} />
            <Info label="Works at" value={user?.profile?.work} />
            <Info label="Studies" value={user?.profile?.studies} />
            <Info label="Activities" value={activitiesValue} />
          </div>
        </Card>
      ) : null}

      {tab === "posts" ? (
        <Card title="Posts">
          <div className="rm-stack">
            {posts.map((item) => (
              <PostCard key={item.id} item={item} />
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "videos" ? (
        <Card title="Videos">
          <div className="rm-stack">
            {videoPosts.map((item) => (
              <PostCard key={item.id} item={item} />
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "likes" ? (
        <Card title="Liked posts">
          <div className="rm-stack">
            {likedPosts.map((item) => (
              <PostCard key={item.id} item={item} />
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
}