"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { absoluteAssetUrl, api, apiPost } from "../lib/api";
import { useAuth } from "../providers/AuthProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { useToast } from "../providers/ToastProvider";

function FloatingMessagesDockInner() {
  const { user } = useAuth();
  const { push } = useToast();
  const { t } = useLanguage();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"messages"|"people">("messages");
  const [conversations, setConversations] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);

  async function loadConversations() {
    const res: any = await api("/messages");
    const items = res?.data?.items || [];
    setConversations(items);
    setActiveId((prev) => prev || params?.get("conversation") || items?.[0]?.id || null);
  }

  async function loadPeople() {
    const res: any = await api("/users/me/follows");
    const all = [...(res?.data?.followers || []), ...(res?.data?.following || [])];
    const uniq = all.filter((x: any, i: number, arr: any[]) => arr.findIndex((y) => y.id === x.id) === i);
    setPeople(uniq);
  }

  async function loadMessages(id: string) {
    const res: any = await api(`/messages/${id}/messages`);
    setMessages(res?.data?.items || []);
  }

  useEffect(() => {
    if (!user || !open) return;
    void loadConversations();
    void loadPeople();
  }, [user, open]);

  useEffect(() => {
    if (!activeId || !open) return;
    void loadMessages(activeId);
  }, [activeId, open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const unread = useMemo(() => conversations.reduce((sum, c) => sum + Number(c.unreadCount || 0), 0), [conversations]);

  if (!user) return null;

  return (
    <>
      <button type="button" className="fixed bottom-6 right-6 z-[95] flex items-center gap-2 rounded-full border border-cyan-400/35 bg-[linear-gradient(180deg,rgba(10,25,45,0.94),rgba(4,12,24,0.96))] px-4 py-3 text-sm font-semibold text-cyan-100 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl" onClick={() => setOpen((v) => !v)}>
        <span>💬</span>
        <span>{t("messages")}</span>
        {unread ? <span className="grid min-w-[22px] place-items-center rounded-full bg-cyan-400/20 px-2 py-0.5 text-xs font-black text-cyan-100">{unread}</span> : null}
      </button>
      {open ? (
        <div ref={panelRef} className="fixed bottom-24 right-6 z-[96] flex h-[70vh] w-[380px] flex-col overflow-hidden rounded-[28px] border border-border/70 bg-[linear-gradient(180deg,rgba(8,14,28,0.96),rgba(4,10,20,0.98))] shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm font-black text-white">{t("messages")}</div>
              <button className="navlink" onClick={() => setOpen(false)}>{t("close")}</button>
            </div>
            <div className="mt-3 flex gap-2">
              <button className={`rm-action-btn rm-action-btn--sm ${tab === "messages" ? "rm-action-btn--cyan" : "rm-action-btn--ghost"}`} onClick={() => setTab("messages")}>{t("conversations")}</button>
              <button className={`rm-action-btn rm-action-btn--sm ${tab === "people" ? "rm-action-btn--cyan" : "rm-action-btn--ghost"}`} onClick={() => setTab("people")}>{t("people")}</button>
            </div>
          </div>
          {tab === "people" ? (
            <div className="flex-1 overflow-y-auto p-3">
              <div className="space-y-2">
                {people.map((person) => {
                  const avatar = absoluteAssetUrl(person.avatarUrl);
                  return <button key={person.id} type="button" className="flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-3 text-left" onClick={async () => {
                    try {
                      const res: any = await apiPost('/messages/start', { targetUserId: person.id });
                      setTab('messages');
                      setOpen(true);
                      await loadConversations();
                      setActiveId(res?.data?.conversationId || null);
                    } catch (e:any) { push('error', 'Messages', e?.message ?? String(e)); }
                  }}>
                    {avatar ? <img src={avatar} alt={person.username} className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 font-black">{(person.displayName || person.username || 'U').slice(0,1).toUpperCase()}</div>}
                    <div><div className="text-sm font-semibold text-white">{person.displayName || person.username}</div><div className="text-xs text-white/45">@{person.username}</div></div>
                  </button>;
                })}
                {!people.length ? <div className="p-3 text-sm text-white/60">{t("noFollowersYet")}</div> : null}
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-[150px_minmax(0,1fr)]">
              <div className="border-r border-white/8 p-2 overflow-y-auto">
                <div className="space-y-2">
                  {conversations.map((item) => {
                    const peer = item.members?.find((m: any) => m.id !== user.id) || item.members?.[0];
                    const avatar = absoluteAssetUrl(peer?.avatarUrl);
                    return <button key={item.id} type="button" className={`w-full rounded-2xl border px-2 py-2 text-left ${activeId === item.id ? 'border-cyan-400/30 bg-cyan-400/10' : 'border-white/8 bg-white/[0.03]'}`} onClick={() => setActiveId(item.id)}>
                      <div className="flex items-center gap-2">{avatar ? <img src={avatar} alt={peer?.username} className="h-8 w-8 rounded-full object-cover" /> : <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-black">{(peer?.displayName || peer?.username || 'U').slice(0,1).toUpperCase()}</div>}<div className="min-w-0"><div className="truncate text-xs font-semibold text-white">{item.title}</div><div className="truncate text-[11px] text-white/45">{item.lastMessage?.body || t('startConversation')}</div></div></div>
                    </button>;
                  })}
                </div>
              </div>
              <div className="flex min-h-0 flex-col">
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {messages.map((msg) => {
                    const avatar = absoluteAssetUrl(msg?.author?.avatarUrl);
                    return <div key={msg.id} className="flex gap-2">{avatar ? <img src={avatar} alt={msg?.author?.username} className="h-8 w-8 rounded-full object-cover" /> : <div className="grid h-8 w-8 place-items-center rounded-full bg-white/10 text-xs font-black">{(msg?.author?.displayName || msg?.author?.username || 'U').slice(0,1).toUpperCase()}</div>}<div className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-2 text-sm text-white/90">{msg.body}</div></div>;
                  })}
                  {!messages.length ? <div className="text-sm text-white/55">{t('noMessagesYet')}</div> : null}
                </div>
                <div className="border-t border-white/8 p-3">
                  <textarea className="rm-textarea" rows={3} placeholder={t('writePrivateMessage')} value={body} onChange={(e) => setBody(e.target.value)} />
                  <div className="mt-2 flex justify-end"><button className="rm-action-btn rm-action-btn--cyan rm-action-btn--sm" disabled={!activeId || loading} onClick={async () => {
                    if (!activeId || !body.trim()) return;
                    try {
                      setLoading(true);
                      await apiPost(`/messages/${activeId}/messages`, { body: body.trim() });
                      setBody('');
                      await loadMessages(activeId);
                      await loadConversations();
                    } catch (e:any) { push('error', 'Messages', e?.message ?? String(e)); }
                    finally { setLoading(false); }
                  }}>{t('sendMessage')}</button></div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </>
  );
}

export default function FloatingMessagesDock() {
  return <Suspense fallback={null}><FloatingMessagesDockInner /></Suspense>;
}
