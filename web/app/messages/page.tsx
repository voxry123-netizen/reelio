"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card } from "../ui/kit/Card";
import { api, apiPost, absoluteAssetUrl } from "../lib/api";
import { useToast } from "../providers/ToastProvider";
import { useLanguage } from "../providers/LanguageProvider";

function MessagesPageInner() {
  const params = useSearchParams();
  const { push } = useToast();
  const { t } = useLanguage();
  const [conversations, setConversations] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [conversation, setConversation] = useState<any>(null);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadConversations() {
    const res: any = await api("/messages");
    const items = res?.data?.items || [];
    setConversations(items);
    const requested = params?.get("conversation");
    const first = requested || items?.[0]?.id || null;
    setActiveId(first);
  }

  async function loadMessages(id: string) {
    const res: any = await api(`/messages/${id}/messages`);
    setConversation(res?.data?.conversation || null);
    setMessages(res?.data?.items || []);
  }

  useEffect(() => {
    (async () => {
      try {
        await loadConversations();
      } catch (e: any) {
        push("error", t("messages"), e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void loadMessages(activeId);
  }, [activeId]);

  const activeConversation = useMemo(() => conversations.find((x) => x.id === activeId) || null, [conversations, activeId]);

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <Card title={t("messages")} subtitle={t("noConversations")}>
        <div className="rm-stack">
          {loading ? <div className="rm-muted">{t("loadingMessages")}</div> : null}
          {conversations.map((item) => {
            const peer = item.members?.find((m: any) => m.id !== item.selfId) || item.members?.[0];
            const avatar = absoluteAssetUrl(peer?.avatarUrl);
            return (
              <button key={item.id} type="button" className={`flex w-full items-center gap-3 rounded-[20px] border px-3 py-3 text-left transition ${activeId === item.id ? "border-cyan-400/25 bg-cyan-400/10" : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"}`} onClick={() => setActiveId(item.id)}>
                {avatar ? <img src={avatar} alt={peer?.username || "peer"} className="h-11 w-11 rounded-full object-cover" /> : <div className="grid h-11 w-11 place-items-center rounded-full bg-white/10 font-black">{(peer?.username || "U").slice(0,1).toUpperCase()}</div>}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-white">{item.title}</div>
                  <div className="truncate text-xs text-white/45">{item.lastMessage?.body || t("startConversation")}</div>
                </div>
                {item.unreadCount ? <div className="grid h-6 min-w-[24px] place-items-center rounded-full bg-cyan-400/20 px-2 text-xs font-bold text-cyan-200">{item.unreadCount}</div> : null}
              </button>
            );
          })}
          {!loading && conversations.length === 0 ? <div className="rm-muted">{t("noConversations")}</div> : null}
        </div>
      </Card>

      <Card title={conversation?.title || activeConversation?.title || t("conversation")} subtitle={t("writePrivateMessage")}>
        {activeId ? (
          <div className="flex min-h-[620px] flex-col gap-4">
            <div className="flex-1 space-y-3 overflow-y-auto rounded-[22px] border border-white/8 bg-white/[0.03] p-4">
              {messages.map((msg) => {
                const avatar = absoluteAssetUrl(msg?.author?.avatarUrl);
                return (
                  <div key={msg.id} className="flex gap-3">
                    {avatar ? <img src={avatar} alt={msg?.author?.username || "author"} className="mt-1 h-9 w-9 rounded-full object-cover" /> : <div className="mt-1 grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-black">{(msg?.author?.username || "U").slice(0,1).toUpperCase()}</div>}
                    <div className="max-w-[85%] rounded-[18px] border border-white/8 bg-black/25 px-4 py-3">
                      <div className="mb-1 text-xs font-semibold text-white/55">{msg?.author?.displayName || msg?.author?.username} · {new Date(msg.createdAt).toLocaleTimeString()}</div>
                      <div className="whitespace-pre-wrap text-sm text-white/92">{msg.body}</div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 ? <div className="rm-muted">{t("noMessagesYet")}</div> : null}
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/[0.03] p-3">
              <textarea className="rm-textarea" rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder={t("writePrivateMessage")} />
              <div className="mt-3 flex justify-end">
                <button className="rm-action-btn rm-action-btn--cyan" onClick={async () => {
                  if (!body.trim() || !activeId) return;
                  try {
                    await apiPost(`/messages/${activeId}/messages`, { body: body.trim() });
                    setBody("");
                    await loadMessages(activeId);
                    await loadConversations();
                  } catch (e: any) {
                    push("error", "Send failed", e?.message ?? String(e));
                  }
                }}>{t("sendMessage")}</button>
              </div>
            </div>
          </div>
        ) : <div className="rm-muted">{t("selectConversation")}</div>}
      </Card>
    </div>
  );
}

export default function MessagesPage() {
  const { t } = useLanguage();
  return <Suspense fallback={<div className="rm-muted">{t("loadingMessages")}</div>}><MessagesPageInner /></Suspense>;
}
