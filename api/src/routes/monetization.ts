import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { parseBody } from "../lib/http.js";
import { TipSchema } from "../lib/schemas.js";

export async function monetizationRoutes(app: FastifyInstance) {
  // Simple fixed tiers per creator (MVP)
  app.get("/tiers/:creatorId", async (req) => {
    const creatorId = (req.params as any).creatorId as string;
    return ok({ tiers: [
      { tier: "bronze", priceCents: 299 },
      { tier: "silver", priceCents: 599 },
      { tier: "gold", priceCents: 999 },
    ], creatorId });
  });

  app.post("/subscribe", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = req.body as any;
    const creatorId = body.creatorId as string;
    const tier = body.tier as string;
    const priceCents = Number(body.priceCents ?? 0);
    if (!creatorId || !tier || !priceCents) return reply.status(400).send(err("BAD_REQUEST", "Missing fields"));

    const sub = await prisma.subscription.create({
      data: { creatorId, subscriberId: u.id, tier, priceCents, status: "active" },
    });
    return reply.send(ok({ subscription: sub, simulatedPayment: "succeeded" }));
  });

  app.post("/unsubscribe", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = req.body as any;
    const id = body.subscriptionId as string;
    await prisma.subscription.updateMany({ where: { id, subscriberId: u.id }, data: { status: "canceled", endsAt: new Date() } });
    return reply.send(ok({ unsubscribed: true }));
  });

  app.post("/tip", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(TipSchema, req.body);
    if (body.toUserId === u.id) return reply.status(400).send(err("BAD_REQUEST", "Cannot tip yourself"));

    const tip = await prisma.tip.create({
      data: { fromUserId: u.id, toUserId: body.toUserId, postId: body.postId ?? null, amountCents: body.amountCents },
    });
    await prisma.notification.create({ data: { userId: body.toUserId, type: "tip", payloadJson: { fromUserId: u.id, amountCents: body.amountCents, postId: body.postId ?? null } } });
    return reply.send(ok({ tip, simulatedPayment: "succeeded" }));
  });

  // Marketplace items (minimal CRUD)
  app.post("/marketplace/items", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = req.body as any;
    const item = await prisma.marketplaceItem.create({
      data: { creatorId: u.id, type: body.type ?? "digital", title: body.title, description: body.description ?? null, priceCents: Number(body.priceCents ?? 0), assetKey: body.assetKey ?? null },
    });
    return reply.send(ok({ item }));
  });

  app.get("/marketplace/items", async () => {
    const items = await prisma.marketplaceItem.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
    return ok({ items });
  });

  app.patch("/marketplace/items/:id", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const existing = await prisma.marketplaceItem.findUnique({ where: { id } });
    if (!existing || existing.creatorId !== u.id) return reply.status(404).send(err("NOT_FOUND", "Item not found"));
    const body = req.body as any;
    const item = await prisma.marketplaceItem.update({ where: { id }, data: { title: body.title ?? existing.title, description: body.description ?? existing.description, priceCents: body.priceCents ?? existing.priceCents } });
    return reply.send(ok({ item }));
  });

  app.delete("/marketplace/items/:id", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    await prisma.marketplaceItem.deleteMany({ where: { id, creatorId: u.id } });
    return reply.send(ok({ deleted: true }));
  });

  app.post("/marketplace/orders", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = req.body as any;
    const itemId = body.itemId as string;
    const order = await prisma.marketplaceOrder.create({ data: { buyerId: u.id, itemId, status: "paid" } });
    return reply.send(ok({ order, simulatedPayment: "succeeded" }));
  });

  // Ads placeholder
  app.post("/ads/campaigns", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = req.body as any;
    const c = await prisma.adCampaign.create({ data: { advertiserUserId: u.id, name: body.name ?? "Campaign", targetingJson: body.targetingJson ?? {}, budgetCents: Number(body.budgetCents ?? 0), status: "active" } });
    return reply.send(ok({ campaign: c }));
  });

  app.get("/ads/campaigns", async (req) => {
    const u = await app.requireAuth(req);
    const items = await prisma.adCampaign.findMany({ where: { advertiserUserId: u.id }, orderBy: { createdAt: "desc" } });
    return ok({ items });
  });
}
