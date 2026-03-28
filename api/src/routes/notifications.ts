import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";

export async function notificationRoutes(app: FastifyInstance) {
  app.get("/", async (req) => {
    const u = await app.requireAuth(req);
    const items = await prisma.notification.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 80 });

    const actorIds = [...new Set(items.map((n) => String((n.payloadJson as any)?.fromUserId || "")).filter(Boolean))];
    const actors = actorIds.length
      ? await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, username: true, displayName: true, avatarUrl: true } })
      : [];
    const actorMap = new Map(actors.map((a) => [a.id, a]));

    const enriched = items.map((n) => ({
      ...n,
      actor: actorMap.get(String((n.payloadJson as any)?.fromUserId || "")) || null,
    }));

    const unreadCount = items.filter((n) => !n.readAt).length;
    return ok({ items: enriched, unreadCount });
  });

  app.post("/read-all", async (req, reply) => {
    const u = await app.requireAuth(req);
    await prisma.notification.updateMany({ where: { userId: u.id, readAt: null }, data: { readAt: new Date() } });
    return reply.send(ok({ readAll: true }));
  });

  app.post("/:id/read", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const n = await prisma.notification.findUnique({ where: { id } });
    if (!n || n.userId !== u.id) return reply.status(404).send(err("NOT_FOUND", "Notification not found"));
    await prisma.notification.update({ where: { id }, data: { readAt: new Date() } });
    return reply.send(ok({ read: true }));
  });
}
