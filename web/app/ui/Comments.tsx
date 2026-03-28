"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { absoluteAssetUrl, api, apiDelete, apiPatch, apiPost } from "../lib/api";
import { useToast } from "../providers/ToastProvider";
import { useAuth } from "../providers/AuthProvider";

const PROFILE_PREFIX = "__REALM_PROFILE__";
const COMMENT_EMOJIS = ["😀","😁","😂","🤣","😊","😍","😘","😎","🤩","🥳","😢","😭","😡","👍","🔥","💖","👏","🙏","🎉","✨","💯","🤍","🥹","😴","🤯","🤔","🙌","👌","💜","🫶"];

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

function useClickOutside<T extends HTMLElement>(open: boolean, onClose: () => void) {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);
  return ref;
}

function CommentRow({ comment, depth, parentMap, onReply, onUpdated, onDeleted }: any) {
  const { user } = useAuth();
  const { push } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(comment.body || "");
  const avatar = absoluteAssetUrl(comment?.author?.avatarUrl);
  const profile = parseProfile(comment?.author?.bio);
  const canManage = user?.id === comment?.authorId;
  const replyToUser = comment.parentId ? parentMap.get(comment.parentId)?.author?.username : null;

  return (
    <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.02))] p-4 shadow-[0_12px_28px_rgba(0,0,0,0.16)]" style={{ marginLeft: depth ? `${Math.min(depth * 18, 54)}px` : 0 }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          {avatar ? (
            <div className="h-10 w-10 overflow-hidden rounded-full ring-1 ring-white/15"><img src={avatar} alt={comment?.author?.username || "avatar"} className="h-10 w-10 rounded-full object-cover" style={avatarVisualStyle(profile)} /></div>
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-foreground text-background text-xs font-black">{(comment?.author?.username || "U").slice(0, 1).toUpperCase()}</div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm"><span className="font-semibold">@{comment?.author?.username || "unknown"}</span><span className="text-xs text-muted">{new Date(comment.createdAt).toLocaleString()}</span></div>
            {replyToUser ? <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/8 px-3 py-1 text-xs text-cyan-100">↪ Reply to @{replyToUser}</div> : null}
            {editing ? (
              <div className="mt-2 space-y-2">
                <textarea className="rm-textarea" rows={3} value={value} onChange={(e) => setValue(e.target.value)} />
                <div className="flex gap-2">
                  <button className="rm-action-btn rm-action-btn--cyan rm-action-btn--sm" onClick={async () => {
                    try {
                      const body = value.trim();
                      if (!body) return;
                      await apiPatch(`/comments/${comment.id}`, { body });
                      onUpdated(comment.id, body);
                      setEditing(false);
                      push("success", "Comment updated", "Your changes were saved.");
                    } catch (e: any) {
                      push("error", "Update failed", e?.message ?? String(e));
                    }
                  }}>Save</button>
                  <button className="rm-action-btn rm-action-btn--ghost rm-action-btn--sm" onClick={() => { setEditing(false); setValue(comment.body || ""); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className="mt-2 whitespace-pre-wrap text-sm leading-6">{comment.body}</div>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="navlink" onClick={() => onReply(comment.id)}>Reply</button>
          {canManage ? <button className="navlink" onClick={() => setEditing((v) => !v)}>{editing ? "Close" : "Edit"}</button> : null}
          {canManage ? <button className="navlink" onClick={async () => {
            try { await apiDelete(`/comments/${comment.id}`); onDeleted(comment.id); push("success", "Comment deleted", "Removed successfully."); } catch (e: any) { push("error", "Delete failed", e?.message ?? String(e)); }
          }}>Delete</button> : null}
        </div>
      </div>
    </div>
  );
}

export default function Comments({ postId, initialCount = 0, onCountChange }: { postId: string; initialCount?: number; onCountChange?: (count: number) => void; }) {
  const { user } = useAuth();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [value, setValue] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const emojiRef = useClickOutside<HTMLDivElement>(emojiOpen, () => setEmojiOpen(false));

  async function load() {
    setLoading(true);
    try {
      const res: any = await api(`/comments/post/${postId}`);
      const next = res?.data?.items || [];
      setItems(next);
      onCountChange?.(next.length);
    } catch (e: any) {
      push("error", "Comments", e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { if (open && items.length === 0 && !loading) void load(); }, [open]);

  const tree = useMemo(() => {
    const byParent = new Map<string | null, any[]>();
    for (const item of items) {
      const key = item.parentId || null;
      const arr = byParent.get(key) || [];
      arr.push(item);
      byParent.set(key, arr);
    }
    const walk = (parentId: string | null, depth: number): any[] => {
      const arr = byParent.get(parentId) || [];
      return arr.flatMap((comment) => [{ ...comment, __depth: depth }, ...walk(comment.id, depth + 1)]);
    };
    return walk(null, 0);
  }, [items]);

  const parentMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  return (
    <div className="mt-4 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.16)]">
      <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">Comments ({items.length || initialCount})</div><button className="navlink" onClick={() => setOpen((v) => !v)}>{open ? "Hide" : "Show"} comments</button></div>
      {open ? (
        <div className="mt-4 space-y-4">
          {user ? (
            <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.014))] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.14)]">
              {replyTo ? <div className="mb-3 text-xs text-muted">Replying to a comment.<button className="navlink inline px-1 py-0" onClick={() => setReplyTo(null)}>Cancel reply</button></div> : null}
              <textarea className="rm-textarea rm-comment-textarea" rows={3} placeholder="Write a comment..." value={value} onChange={(e) => setValue(e.target.value)} />
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <button className="rm-action-btn rm-action-btn--cyan" onClick={async () => {
                  try {
                    const body = value.trim();
                    if (!body) return;
                    const payload: any = { postId, body };
                    if (replyTo) payload.parentId = replyTo;
                    await apiPost("/comments", payload);
                    setValue(""); setReplyTo(null); await load(); push("success", "Comment added", "Your comment is now visible.");
                  } catch (e: any) { push("error", "Comment failed", e?.message ?? String(e)); }
                }}>Post comment</button>
                <div ref={emojiRef} className="relative ml-auto">
                  <button type="button" className="rm-action-btn rm-action-btn--ghost" onClick={() => setEmojiOpen((v) => !v)}>😊 Emoji</button>
                  {emojiOpen ? (
                    <div className="absolute right-0 top-[calc(100%+12px)] z-30 h-56 w-72 overflow-y-auto rounded-[22px] border border-white/12 bg-[linear-gradient(180deg,rgba(8,15,33,0.98),rgba(5,10,22,0.98))] p-3 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-2xl">
                      <div className="grid grid-cols-6 gap-2">
                        {COMMENT_EMOJIS.map((emoji) => (
                          <button key={emoji} type="button" className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-lg transition hover:border-cyan-300/35 hover:bg-cyan-400/10" onClick={() => { setValue((prev) => `${prev}${emoji}`); setEmojiOpen(false); }}>
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : <div className="text-sm text-muted">Log in to add comments.</div>}
          {loading ? <div className="text-sm text-muted">Loading comments...</div> : null}
          {!loading && tree.length === 0 ? <div className="text-sm text-muted">No comments yet.</div> : null}
          {tree.map((comment) => <CommentRow key={comment.id} comment={comment} depth={comment.__depth || 0} parentMap={parentMap} onReply={(parentId: string) => { setOpen(true); setReplyTo(parentId); }} onUpdated={(id: string, body: string) => setItems((prev) => prev.map((item) => (item.id === id ? { ...item, body } : item)))} onDeleted={(id: string) => setItems((prev) => prev.filter((item) => item.id !== id))} />)}
        </div>
      ) : null}
    </div>
  );
}
