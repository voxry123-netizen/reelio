"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "./kit/Card";
import { apiDelete, apiPatch, apiPost, absoluteAssetUrl } from "../lib/api";
import { useToast } from "../providers/ToastProvider";
import { useAuth } from "../providers/AuthProvider";
import Comments from "./Comments";

const PROFILE_PREFIX = "__REALM_PROFILE__";
const REACTIONS = ["👍", "💖", "😢", "😂"] as const;

type Reaction = (typeof REACTIONS)[number] | null;

function isVideoUrl(url?: string | null) {
  if (!url) return false;
  return /\.(mp4|webm|ogv|ogg|mov|m4v|avi|mkv)(\?|$)/i.test(url);
}

function parseProfile(raw?: string | null) {
  if (!raw) return {} as any;
  if (!String(raw).startsWith(PROFILE_PREFIX)) return {} as any;
  try {
    return JSON.parse(String(raw).slice(PROFILE_PREFIX.length)) || {};
  } catch {
    return {} as any;
  }
}

function avatarVisualStyle(profile: any): React.CSSProperties {
  return {
    objectPosition: `${profile?.avatarFocusX ?? 50}% ${profile?.avatarFocusY ?? 50}%`,
    transform: `scale(${profile?.avatarZoom ?? 1})`,
    filter: profile?.avatarFilter || "none",
  };
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function postPermalink(id: string) {
  if (typeof window === "undefined") return `/posts/${id}`;
  return `${window.location.origin}/posts/${id}`;
}

function MediaLightbox({ open, onClose, url, isVideo, title }: { open: boolean; onClose: () => void; url: string; isVideo: boolean; title?: string }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const seekBy = (delta: number) => {
    const node = videoRef.current;
    if (!node) return;
    const next = Math.max(0, Math.min(Number.isFinite(node.duration) ? node.duration : 0, node.currentTime + delta));
    node.currentTime = next;
    setCurrentTime(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    const node = videoRef.current;
    if (!node) return;
    node.volume = volume;
    node.muted = muted;
  }, [volume, muted, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-4 backdrop-blur-2xl md:p-8" onClick={onClose}>
      <div className="relative w-full max-w-[1400px]" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="absolute -right-2 -top-2 z-[130] inline-flex h-12 w-12 items-center justify-center rounded-full border border-red-400/60 bg-gradient-to-b from-red-500 to-red-700 text-base font-black text-white shadow-[0_18px_40px_rgba(255,40,40,0.34)] transition hover:scale-[1.03] hover:brightness-110 active:scale-[0.98] md:-right-4 md:-top-4 md:h-14 md:w-14 md:text-lg"
          onClick={onClose}
          aria-label="Close media viewer"
        >
          ✕
        </button>

        <div className="flex max-h-[94vh] flex-col gap-3 overflow-visible rounded-[28px] border border-white/10 bg-black/70 p-3 shadow-[0_30px_120px_rgba(0,0,0,0.55)] md:p-4">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            {isVideo ? (
              <video
                ref={videoRef}
                src={url}
                autoPlay
                playsInline
                className="max-h-[78vh] w-full bg-black object-contain"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={(e) => setCurrentTime((e.target as HTMLVideoElement).currentTime || 0)}
                onLoadedMetadata={(e) => setDuration((e.target as HTMLVideoElement).duration || 0)}
              />
            ) : (
              <img src={url} alt={title || "post image"} className="max-h-[82vh] w-full bg-black object-contain" />
            )}
          </div>

          {isVideo ? (
            <div className="rounded-2xl border border-white/10 bg-black/55 p-3 text-white">
              <div className="mb-2 flex items-center justify-between text-xs text-white/70">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <input
                type="range"
                min="0"
                max={Math.max(duration, 0)}
                step="0.1"
                value={Math.min(currentTime, duration || 0)}
                onChange={(e) => {
                  const node = videoRef.current;
                  if (!node) return;
                  const next = Number(e.target.value);
                  node.currentTime = next;
                  setCurrentTime(next);
                }}
                className="w-full"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" onClick={() => seekBy(-10)}>−10s</button>
                <button
                  className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm"
                  onClick={() => {
                    if (!videoRef.current) return;
                    if (videoRef.current.paused) {
                      void videoRef.current.play();
                    } else {
                      videoRef.current.pause();
                    }
                  }}
                >
                  {playing ? "Pause" : "Play"}
                </button>
                <button className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" onClick={() => seekBy(10)}>+10s</button>
                <button className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm" onClick={() => setMuted((v) => !v)}>
                  {muted ? "Unmute" : "Mute"}
                </button>
                <div className="ml-auto flex min-w-[180px] items-center gap-2 text-xs text-white/80">
                  <span>Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={muted ? 0 : volume}
                    onChange={(e) => {
                      const value = Number(e.target.value);
                      setVolume(value);
                      setMuted(value === 0);
                    }}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ShareButton({ postId, title }: { postId: string; title?: string }) {
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const url = postPermalink(postId);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title || "REALM post");

  return (
    <div className="relative">
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-2xl border border-cyan-400/35 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-100 shadow-[0_10px_26px_rgba(34,211,238,0.16)] transition hover:border-cyan-300/55 hover:bg-cyan-400/16"
        onClick={() => setOpen((v) => !v)}
      >
        ↗ Share
      </button>
      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[220px] rounded-2xl border border-white/12 bg-[#071224]/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <button
            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/6"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              push("success", "Link copied", "Post link copied to clipboard.");
              setOpen(false);
            }}
          >
            Copy link
          </button>
          <button
            className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/6"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({ title: title || "REALM post", url });
              } else {
                window.open(`https://wa.me/?text=${text}%20${encoded}`, "_blank", "noopener,noreferrer");
              }
              setOpen(false);
            }}
          >
            Native share
          </button>
          <a className="block rounded-xl px-3 py-2 text-sm hover:bg-white/6" href={`https://wa.me/?text=${text}%20${encoded}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="block rounded-xl px-3 py-2 text-sm hover:bg-white/6" href={`https://www.facebook.com/dialog/send?link=${encoded}&app_id=291494419107518&redirect_uri=${encoded}`} target="_blank" rel="noreferrer">Messenger</a>
          <a className="block rounded-xl px-3 py-2 text-sm hover:bg-white/6" href={`https://www.instagram.com/`} target="_blank" rel="noreferrer">Instagram</a>
        </div>
      ) : null}
    </div>
  );
}

export default function PostCard({ item, onDeleted }: { item: any; onDeleted?: (id: string) => void }) {
  const { push } = useToast();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [mediaBroken, setMediaBroken] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(Number(item?._count?.likes || 0));
  const [commentCount, setCommentCount] = useState<number>(Number(item?._count?.comments || 0));
  const [reaction, setReaction] = useState<Reaction>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const mediaUrl = useMemo(() => absoluteAssetUrl(item?.media?.[0]?.storageKeyOriginal), [item]);
  const mediaIsVideo = isVideoUrl(mediaUrl);
  const isOwnPost = user?.id && item?.authorId === user.id;
  const avatarUrl = absoluteAssetUrl(item?.author?.avatarUrl);
  const authorProfile = parseProfile(item?.author?.bio);

  useEffect(() => {
    if (!user?.id || !item?.id) return;
    const key = `realm:reaction:${user.id}:${item.id}`;
    const stored = localStorage.getItem(key) as Reaction;
    if (stored && REACTIONS.includes(stored as any)) setReaction(stored);
  }, [user?.id, item?.id]);

  async function setPostReaction(next: Reaction) {
    if (!user) {
      push("error", "Login required", "You need to be logged in to react.");
      return;
    }
    const key = `realm:reaction:${user.id}:${item.id}`;
    try {
      if (!reaction && next) {
        await apiPost(`/likes/${item.id}`);
        setLikeCount((v) => v + 1);
        setReaction(next);
        localStorage.setItem(key, next);
      } else if (reaction && !next) {
        await apiDelete(`/likes/${item.id}`);
        setLikeCount((v) => Math.max(0, v - 1));
        setReaction(null);
        localStorage.removeItem(key);
      } else if (reaction && next) {
        setReaction(next);
        localStorage.setItem(key, next);
      }
    } catch (e: any) {
      push("error", "Reaction failed", e?.message ?? String(e));
    }
  }

  return (
    <>
      <Card className="overflow-visible border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.025))] shadow-[0_20px_80px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="rm-card-head border-b border-white/8 bg-[linear-gradient(90deg,rgba(255,255,255,0.035),rgba(46,166,255,0.04),rgba(46,233,166,0.03))]">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href={item?.author?.id ? `/profile/${item.author.id}` : "#"}>
                {avatarUrl ? (
                  <div className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/15">
                    <img src={avatarUrl} alt={item?.author?.username || "avatar"} className="h-11 w-11 rounded-full object-cover" style={avatarVisualStyle(authorProfile)} />
                  </div>
                ) : (
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-background text-sm font-black">{(item?.author?.username || "U").slice(0, 1).toUpperCase()}</div>
                )}
              </Link>
              <div>
                <div className="rm-card-title">{item?.title || "Untitled post"}</div>
                <div className="rm-muted text-sm">
                  <Link href={item?.author?.id ? `/profile/${item.author.id}` : "#"}>@{item?.author?.username || "unknown"}</Link>
                  {item?.realm?.name ? <> · in {item.realm.name}</> : null}
                </div>
              </div>
            </div>

            {isOwnPost ? (
              <div className="relative">
                <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/5 text-lg text-white/85 hover:bg-white/10" onClick={() => setMenuOpen((v) => !v)}>
                  ⋯
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+8px)] z-20 min-w-[180px] rounded-2xl border border-white/12 bg-[#071224]/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
                    <button
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-white/6"
                      onClick={async () => {
                        const title = window.prompt("Edit title", item?.title || "");
                        if (title == null) return;
                        const caption = window.prompt("Edit caption", item?.caption || "");
                        if (caption == null) return;
                        try {
                          await apiPatch(`/posts/${item.id}`, { title, caption });
                          push("success", "Post updated", "Refresh page to see the latest content.");
                          setMenuOpen(false);
                        } catch (e: any) {
                          push("error", "Edit failed", e?.message ?? String(e));
                        }
                      }}
                    >
                      Edit post
                    </button>
                    <button
                      className="block w-full rounded-xl px-3 py-2 text-left text-sm text-red-300 hover:bg-red-500/10"
                      onClick={async () => {
                        try {
                          setDeleting(true);
                          await apiDelete(`/posts/${item.id}`);
                          push("success", "Post deleted", item.title || item.id);
                          onDeleted?.(item.id);
                          setMenuOpen(false);
                        } catch (e: any) {
                          push("error", "Delete failed", e?.message ?? String(e));
                        } finally {
                          setDeleting(false);
                        }
                      }}
                      disabled={deleting}
                    >
                      {deleting ? "Deleting..." : "Delete post"}
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rm-card-body">
          {item?.caption ? <p className="whitespace-pre-wrap leading-7 text-white/92">{item.caption}</p> : null}
          {mediaUrl && !mediaBroken ? (
            <button type="button" className="mt-4 block w-full overflow-hidden rounded-[24px] border border-white/12 bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,0.28)]" onClick={() => setLightboxOpen(true)} title="Open media in popup">
              {mediaIsVideo ? (
                <video src={mediaUrl} preload="metadata" autoPlay muted loop playsInline className="block max-h-[70vh] w-full bg-black object-contain" onError={() => setMediaBroken(true)} />
              ) : (
                <img src={mediaUrl} alt={item?.title || "post image"} className="block max-h-[70vh] w-full bg-black object-contain" onError={() => setMediaBroken(true)} />
              )}
            </button>
          ) : null}
          {mediaBroken ? <div className="mt-4 text-sm text-muted">This media could not be previewed in the feed.</div> : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>{likeCount} like{likeCount === 1 ? "" : "s"} · {commentCount} comment{commentCount === 1 ? "" : "s"}</span>
            <span>Created {new Date(item.createdAt).toLocaleString()}</span>
          </div>

          <div className="mt-3 flex items-center justify-between gap-4">
            <div className="rounded-2xl border border-white/12 bg-white/[0.03] px-2 py-2 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
              <div className="flex items-center gap-2">
                {REACTIONS.map((emoji) => {
                  const active = reaction === emoji;
                  return (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => void setPostReaction(active ? null : emoji)}
                      className={`grid h-10 w-10 place-items-center rounded-xl border text-lg transition ${active ? "border-cyan-300/55 bg-cyan-400/14 shadow-[0_0_0_1px_rgba(103,232,249,0.15)]" : "border-white/10 bg-white/[0.025] hover:border-white/18 hover:bg-white/[0.05]"}`}
                      title={active ? "Remove reaction" : "React"}
                    >
                      <span className="scale-[0.8]">{emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <ShareButton postId={item.id} title={item?.title} />
          </div>

          <Comments postId={item.id} initialCount={commentCount} onCountChange={setCommentCount} />
        </div>
      </Card>

      {lightboxOpen && mediaUrl ? <MediaLightbox open={lightboxOpen} onClose={() => setLightboxOpen(false)} url={mediaUrl} isVideo={mediaIsVideo} title={item?.title} /> : null}
    </>
  );
}
