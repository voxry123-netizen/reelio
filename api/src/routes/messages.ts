import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";

function conversationLabel(conv: any, selfId: string) {
  const others = (conv.members || []).filter((m: any) => m.userId !== selfId).map((m: any) => m.user);
  if (conv.title) return conv.title;
  return others.map((u: any) => u.displayName || u.username).join(", ") || "Conversation";
}

export async function messageRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const u = await app.requireAuth(req);
    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId: u.id } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: {
          include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
        },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      take: 50,
    });

    const items = conversations.map((conv) => {
      const me = conv.members.find((m) => m.userId === u.id);
      const lastMessage = conv.messages[0] || null;
      const unreadCount = lastMessage && (!me?.lastReadAt || lastMessage.createdAt > me.lastReadAt) && lastMessage.authorId !== u.id ? 1 : 0;
      return {
        id: conv.id,
        title: conversationLabel(conv, u.id),
        updatedAt: conv.updatedAt,
        unreadCount,
        members: conv.members.map((m) => m.user),
        lastMessage,
      };
    });

    return ok({ items });
  });

  app.post("/start", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = (req.body || {}) as any;
    const targetUserId = String(body.targetUserId || "");
    if (!targetUserId) return reply.status(400).send(err("BAD_REQUEST", "Missing target user"));
    if (targetUserId === u.id) return reply.status(400).send(err("BAD_REQUEST", "Cannot message yourself"));

    const existing = await prisma.conversation.findFirst({
      where: {
        members: { every: { userId: { in: [u.id, targetUserId] } }, some: { userId: u.id } },
      },
      include: { members: true },
    });

    if (existing && existing.members.length === 2) return reply.send(ok({ conversationId: existing.id }));

    const conv = await prisma.conversation.create({
      data: {
        members: {
          create: [{ userId: u.id }, { userId: targetUserId }],
        },
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "message",
        payloadJson: { fromUserId: u.id, conversationId: conv.id },
      },
    });

    return reply.send(ok({ conversationId: conv.id }));
  });

  app.get("/:id/messages", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = String((req.params as any).id || "");
    const member = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId: id, userId: u.id } } });
    if (!member) return reply.status(403).send(err("FORBIDDEN", "Not part of this conversation"));

    const conversation = await prisma.conversation.findUnique({
      where: { id },
      include: {
        members: { include: { user: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
        messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } } },
      },
    });
    if (!conversation) return reply.status(404).send(err("NOT_FOUND", "Conversation not found"));

    await prisma.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId: u.id } }, data: { lastReadAt: new Date() } });

    return reply.send(ok({
      conversation: {
        id: conversation.id,
        title: conversationLabel(conversation, u.id),
        members: conversation.members.map((m) => m.user),
      },
      items: conversation.messages,
    }));
  });

  app.post("/:id/messages", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = String((req.params as any).id || "");
    const body = (req.body || {}) as any;
    const text = String(body.body || "").trim();
    if (!text) return reply.status(400).send(err("BAD_REQUEST", "Message cannot be empty"));
    const conversation = await prisma.conversation.findUnique({ where: { id }, include: { members: true } });
    if (!conversation) return reply.status(404).send(err("NOT_FOUND", "Conversation not found"));
    if (!conversation.members.some((m) => m.userId === u.id)) return reply.status(403).send(err("FORBIDDEN", "Not part of this conversation"));

    const message = await prisma.message.create({
      data: { conversationId: id, authorId: u.id, body: text },
      include: { author: { select: { id: true, username: true, displayName: true, avatarUrl: true } } },
    });
    await prisma.conversation.update({ where: { id }, data: { updatedAt: new Date() } });
    await prisma.conversationMember.update({ where: { conversationId_userId: { conversationId: id, userId: u.id } }, data: { lastReadAt: new Date() } });

    const otherMembers = conversation.members.filter((m) => m.userId !== u.id);
    for (const m of otherMembers) {
      await prisma.notification.create({ data: { userId: m.userId, type: "message", payloadJson: { fromUserId: u.id, conversationId: id, messageId: message.id } } });
    }

    return reply.send(ok({ message }));
  });
}
