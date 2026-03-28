import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { parseBody } from "../lib/http.js";
import { CreateRealmSchema } from "../lib/schemas.js";

async function requireRealmRole(realmId: string, userId: string) {
  const m = await prisma.realmMember.findUnique({ where: { realmId_userId: { realmId, userId } } });
  return m?.role ?? null;
}

export async function realmRoutes(app: FastifyInstance) {

  app.get("/", async (_req, reply) => {
    const realms = await prisma.realm.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, slug: true, name: true, description: true, createdAt: true },
      take: 100,
    });
    return reply.send(ok({ items: realms }));
  });

  app.post("/", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(CreateRealmSchema, req.body);

    const exists = await prisma.realm.findUnique({ where: { slug: body.slug } });
    if (exists) return reply.status(409).send(err("REALM_EXISTS", "Realm slug already exists"));

    const realm = await prisma.realm.create({
      data: { slug: body.slug, name: body.name, description: body.description, ownerUserId: u.id },
    });
    await prisma.realmMember.create({ data: { realmId: realm.id, userId: u.id, role: "owner" } });

    await prisma.memoryEvent.create({ data: { userId: u.id, type: "realm_created", refId: realm.id } });

    return reply.send(ok({ realm }));
  });

  app.get("/:slug", async (req, reply) => {
    const slug = (req.params as any).slug as string;
    const realm = await prisma.realm.findUnique({ where: { slug } });
    if (!realm) return reply.status(404).send(err("NOT_FOUND", "Realm not found"));
    return reply.send(ok({ realm }));
  });

  app.post("/:slug/join", async (req, reply) => {
    const u = await app.requireAuth(req);
    const slug = (req.params as any).slug as string;
    const realm = await prisma.realm.findUnique({ where: { slug } });
    if (!realm) return reply.status(404).send(err("NOT_FOUND", "Realm not found"));

    await prisma.realmMember.upsert({
      where: { realmId_userId: { realmId: realm.id, userId: u.id } },
      update: {},
      create: { realmId: realm.id, userId: u.id, role: "member" },
    });

    await prisma.memoryEvent.create({ data: { userId: u.id, type: "realm_join", refId: realm.id } });
    return reply.send(ok({ joined: true }));
  });

  app.post("/:slug/leave", async (req, reply) => {
    const u = await app.requireAuth(req);
    const slug = (req.params as any).slug as string;
    const realm = await prisma.realm.findUnique({ where: { slug } });
    if (!realm) return reply.status(404).send(err("NOT_FOUND", "Realm not found"));
    await prisma.realmMember.deleteMany({ where: { realmId: realm.id, userId: u.id } });
    await prisma.memoryEvent.create({ data: { userId: u.id, type: "realm_leave", refId: realm.id } });
    return reply.send(ok({ left: true }));
  });

  // Admin role management: body { userId, role }
  app.post("/:slug/roles", async (req, reply) => {
    const u = await app.requireAuth(req);
    const slug = (req.params as any).slug as string;
    const body = req.body as any;
    const realm = await prisma.realm.findUnique({ where: { slug } });
    if (!realm) return reply.status(404).send(err("NOT_FOUND", "Realm not found"));

    const myRole = await requireRealmRole(realm.id, u.id);
    if (!myRole || (myRole !== "owner" && myRole !== "admin")) return reply.status(403).send(err("FORBIDDEN", "Insufficient role"));

    const targetUserId = body.userId as string;
    const role = body.role as string;
    if (!["owner","admin","mod","member"].includes(role)) return reply.status(400).send(err("BAD_ROLE", "Invalid role"));

    await prisma.realmMember.upsert({
      where: { realmId_userId: { realmId: realm.id, userId: targetUserId } },
      update: { role },
      create: { realmId: realm.id, userId: targetUserId, role },
    });

    return reply.send(ok({ updated: true }));
  });

  // settings patch (rules_json/monetization_json)
  app.patch("/:slug/settings", async (req, reply) => {
    const u = await app.requireAuth(req);
    const slug = (req.params as any).slug as string;
    const body = req.body as any;
    const realm = await prisma.realm.findUnique({ where: { slug } });
    if (!realm) return reply.status(404).send(err("NOT_FOUND", "Realm not found"));

    const myRole = await requireRealmRole(realm.id, u.id);
    if (!myRole || (myRole !== "owner" && myRole !== "admin")) return reply.status(403).send(err("FORBIDDEN", "Insufficient role"));

    const updated = await prisma.realm.update({
      where: { id: realm.id },
      data: { rulesJson: body.rulesJson ?? realm.rulesJson, monetizationJson: body.monetizationJson ?? realm.monetizationJson },
    });

    return reply.send(ok({ realm: updated }));
  });
}
