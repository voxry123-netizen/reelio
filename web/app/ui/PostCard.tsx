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

function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
  return ref;
}

function PopupShell({ open, onClose, title, children, wide = false }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/65 p-4 backdrop-blur-2xl" onClick={onClose}>
      <div className={`relative w-full ${wide ? "max-w-[760px]" : "max-w-[560px]"} rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(7,14,32,0.96),rgba(5,10,22,0.94))] shadow-[0_40px_120px_rgba(0,0,0,0.58)]`} onClick={(e) => e.stopPropagation()}>
        <button type="button" className="absolute right-4 top-4 z-10 grid h-11 w-11 place-items-center rounded-full border border-red-400/45 bg-[linear-gradient(180deg,rgba(255,79,79,0.98),rgba(196,27,27,0.98))] text-lg font-black text-white shadow-[0_16px_36px_rgba(255,45,45,0.28)] transition hover:scale-[1.04] hover:brightness-110" onClick={onClose} aria-label="Close popup">✕</button>
        <div className="border-b border-white/8 px-6 py-5 pr-16">
          <div className="text-lg font-black tracking-[0.02em] text-white">{title}</div>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
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
      <div className="relative w-full max-w-[1420px]" onClick={(e) => e.stopPropagation()}>
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

function ShareModal({ open, onClose, postId, title }: { open: boolean; onClose: () => void; postId: string; title?: string }) {
  const { push } = useToast();
  const url = postPermalink(postId);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title || "Reelio post");

  return (
    <PopupShell open={open} onClose={onClose} title="Share post">
      <div className="space-y-4">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
          Share this post instantly or copy its direct link.
          <div className="mt-3 break-all rounded-xl border border-white/8 bg-black/25 px-3 py-2 font-mono text-xs text-white/80">{url}</div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="rm-action-btn rm-action-btn--cyan justify-center"
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              push("success", "Link copied", "Post link copied to clipboard.");
              onClose();
            }}
          >
            Copy link
          </button>
          <button
            className="rm-action-btn rm-action-btn--ghost justify-center"
            onClick={async () => {
              if (navigator.share) {
                await navigator.share({ title: title || "Reelio post", url });
              } else {
                window.open(`https://wa.me/?text=${text}%20${encoded}`, "_blank", "noopener,noreferrer");
              }
              onClose();
            }}
          >
            Native share
          </button>
          <a className="rm-action-btn rm-action-btn--ghost justify-center" href={`https://wa.me/?text=${text}%20${encoded}`} target="_blank" rel="noreferrer">WhatsApp</a>
          <a className="rm-action-btn rm-action-btn--ghost justify-center" href={`https://www.facebook.com/dialog/send?link=${encoded}&app_id=291494419107518&redirect_uri=${encoded}`} target="_blank" rel="noreferrer">Messenger</a>
        </div>
      </div>
    </PopupShell>
  );
}

function EditPostModal({ open, onClose, item, onSaved }: { open: boolean; onClose: () => void; item: any; onSaved: (next: { title: string; caption: string }) => void }) {
  const { push } = useToast();
  const [title, setTitle] = useState(item?.title || "");
  const [caption, setCaption] = useState(item?.caption || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(item?.title || "");
    setCaption(item?.caption || "");
  }, [open, item?.title, item?.caption]);

  return (
    <PopupShell open={open} onClose={onClose} title="Edit post" wide>
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-white/80">
          Title
          <input className="rm-input mt-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Post title" />
        </label>
        <label className="block text-sm font-semibold text-white/80">
          Caption
          <textarea className="rm-textarea mt-2" rows={6} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Post caption" />
        </label>
        <div className="flex justify-end gap-3">
          <button type="button" className="rm-action-btn rm-action-btn--ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="rm-action-btn rm-action-btn--cyan"
            disabled={saving}
            onClick={async () => {
              try {
                setSaving(true);
                await apiPatch(`/posts/${item.id}`, { title: title.trim(), caption: caption.trim() });
                onSaved({ title: title.trim(), caption: caption.trim() });
                push("success", "Post updated", "Your post was updated successfully.");
                onClose();
              } catch (e: any) {
                push("error", "Edit failed", e?.message ?? String(e));
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </div>
    </PopupShell>
  );
}

export default function PostCard({ item, onDeleted }: { item: any; onDeleted?: (id: string) => void }) {
  const { push } = useToast();
  const { user } = useAuth();
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [mediaBroken, setMediaBroken] = useState(false);
  const [likeCount, setLikeCount] = useState<number>(Number(item?._count?.likes || 0));
  const [commentCount, setCommentCount] = useState<number>(Number(item?._count?.comments || 0));
  const [reaction, setReaction] = useState<Reaction>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postView, setPostView] = useState<any>(item);

  const mediaUrl = absoluteAssetUrl(postView?.media?.[0]?.storageKeyOriginal);
  const mediaIsVideo = isVideoUrl(mediaUrl);
  const isOwnPost = !!(user?.id && user.id === postView?.author?.id);
  const menuRef = useClickOutside<HTMLDivElement>(menuOpen, () => setMenuOpen(false));
  const authorProfile = useMemo(() => parseProfile(postView?.author?.bio), [postView?.author?.bio]);
  const avatarUrl = absoluteAssetUrl(postView?.author?.avatarUrl);
  const variant = useMemo(() => {
    const source = String(postView?.id || postView?.title || "");
    const code = source.split("").reduce((sum: number, ch: string) => sum + ch.charCodeAt(0), 0);
    return code % 3;
  }, [postView?.id, postView?.title]);

  useEffect(() => {
    if (!user?.id || !postView?.id) return;
    const key = `realm:reaction:${user.id}:${postView.id}`;
    const saved = localStorage.getItem(key) as Reaction;
    if (saved && REACTIONS.includes(saved as any)) setReaction(saved);
  }, [user?.id, postView?.id]);

  async function setPostReaction(next: Reaction) {
    if (!user?.id) {
      push("error", "Login required", "Log in to react to posts.");
      return;
    }
    const key = `realm:reaction:${user.id}:${postView.id}`;
    try {
      if (!reaction && next) {
        await apiPost(`/likes/${postView.id}`);
        setLikeCount((v) => v + 1);
        setReaction(next);
        localStorage.setItem(key, next);
      } else if (reaction && !next) {
        await apiDelete(`/likes/${postView.id}`);
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
      <Card className={`rm-post-card rm-post-variant-${variant} overflow-visible border-white/12 backdrop-blur-xl`}>
        <div className="rm-card-head rm-post-head border-b border-white/8">
          <div className="flex w-full items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <Link href={postView?.author?.id ? `/profile/${postView.author.id}` : "#"}>
                {avatarUrl ? (
                  <div className="h-11 w-11 overflow-hidden rounded-full ring-1 ring-white/15">
                    <img src={avatarUrl} alt={postView?.author?.username || "avatar"} className="h-11 w-11 rounded-full object-cover" style={avatarVisualStyle(authorProfile)} />
                  </div>
                ) : (
                  <div className="grid h-11 w-11 place-items-center rounded-full bg-foreground text-background text-sm font-black">{(postView?.author?.username || "U").slice(0, 1).toUpperCase()}</div>
                )}
              </Link>
              <div className="min-w-0">
                <div className="rm-card-title truncate">{postView?.title || "Untitled post"}</div>
                <div className="rm-muted text-sm">
                  <Link href={postView?.author?.id ? `/profile/${postView.author.id}` : "#"}>@{postView?.author?.username || "unknown"}</Link>
                  {postView?.realm?.name ? <> · in {postView.realm.name}</> : null}
                </div>
              </div>
            </div>

            {isOwnPost ? (
              <div ref={menuRef} className="relative ml-auto shrink-0 self-start">
                <button type="button" className="rm-action-btn rm-action-btn--ghost rm-action-icon" onClick={() => setMenuOpen((v) => !v)} aria-label="Post options">
                  ⋯
                </button>
                {menuOpen ? (
                  <div className="absolute right-0 top-[calc(100%+10px)] z-20 min-w-[210px] rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,33,0.98),rgba(5,10,22,0.98))] p-2 shadow-[0_20px_60px_rgba(0,0,0,0.48)] backdrop-blur-2xl">
                    <button className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-white/88 transition hover:bg-white/6" onClick={() => { setEditOpen(true); setMenuOpen(false); }}>
                      Edit post
                    </button>
                    <button
                      className="block w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold text-red-300 transition hover:bg-red-500/10"
                      onClick={async () => {
                        try {
                          setDeleting(true);
                          await apiDelete(`/posts/${postView.id}`);
                          push("success", "Post deleted", postView.title || postView.id);
                          onDeleted?.(postView.id);
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
          {postView?.caption ? <p className="whitespace-pre-wrap leading-7 text-white/92">{postView.caption}</p> : null}
          {mediaUrl && !mediaBroken ? (
            <button type="button" className="mt-4 block w-full overflow-hidden rounded-[24px] border border-white/12 bg-black/30 shadow-[0_18px_50px_rgba(0,0,0,0.28)] transition hover:translate-y-[-1px] hover:border-white/16 hover:shadow-[0_22px_60px_rgba(0,0,0,0.34)]" onClick={() => setLightboxOpen(true)} title="Open media in popup">
              {mediaIsVideo ? (
                <video src={mediaUrl} preload="metadata" autoPlay muted loop playsInline className="block max-h-[70vh] w-full bg-black object-contain" onError={() => setMediaBroken(true)} />
              ) : (
                <img src={mediaUrl} alt={postView?.title || "post image"} className="block max-h-[70vh] w-full bg-black object-contain" onError={() => setMediaBroken(true)} />
              )}
            </button>
          ) : null}
          {mediaBroken ? <div className="mt-4 text-sm text-muted">This media could not be previewed in the feed.</div> : null}

          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span>{likeCount} like{likeCount === 1 ? "" : "s"} · {commentCount} comment{commentCount === 1 ? "" : "s"}</span>
            <span>Created {new Date(postView.createdAt).toLocaleString()}</span>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              {REACTIONS.map((emoji) => {
                const active = reaction === emoji;
                return (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => void setPostReaction(active ? null : emoji)}
                    className={`rm-react-emoji ${active ? "is-active" : ""}`}
                    title={active ? "Remove reaction" : "React"}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>

            <button type="button" className="rm-action-btn rm-action-btn--cyan" onClick={() => setShareOpen(true)}>
              ↗ Share
            </button>
          </div>

          <Comments postId={postView.id} initialCount={commentCount} onCountChange={setCommentCount} />
        </div>
      </Card>

      {lightboxOpen && mediaUrl ? <MediaLightbox open={lightboxOpen} onClose={() => setLightboxOpen(false)} url={mediaUrl} isVideo={mediaIsVideo} title={postView?.title} /> : null}
      <ShareModal open={shareOpen} onClose={() => setShareOpen(false)} postId={postView.id} title={postView?.title} />
      <EditPostModal open={editOpen} onClose={() => setEditOpen(false)} item={postView} onSaved={(next) => setPostView((prev: any) => ({ ...prev, ...next }))} />
    </>
  );
}
