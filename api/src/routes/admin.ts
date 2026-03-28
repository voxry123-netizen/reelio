import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";

async function requireAdmin(app: FastifyInstance, req: any, reply: FastifyReply) {
  const u = await app.requireAuth(req);
  const me = await prisma.user.findUnique({ where: { id: u.id }, select: { email: true, username: true } });
  // MVP admin rule: username === 'admin'
  if (me?.username !== "admin") return reply.status(403).send({ ok:false, error:{ code:"FORBIDDEN", message:"Forbidden" }});
  return u;
}

export async function adminRoutes(app: FastifyInstance) {
  app.get("/users", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const page = Number((req.query as any).page ?? 1);
    const size = Math.min(50, Number((req.query as any).size ?? 20));
    const skip = (page - 1) * size;
    const items = await prisma.user.findMany({ skip, take: size, orderBy: { createdAt: "desc" }, select: { id: true, email: true, username: true, isVerified: true, shadowbanned: true, shadowbanReason: true, createdAt: true } });
    return ok({ page, size, items });
  });

  app.patch("/users/:id/verify", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const id = (req.params as any).id as string;
    const verified = Boolean((req.body as any)?.verified ?? true);
    const user = await prisma.user.update({ where: { id }, data: { isVerified: verified, identityScore: verified ? 100 : 10 } });
    return reply.send(ok({ user }));
  });

  app.patch("/users/:id/shadowban", async (req: FastifyRequest, reply: FastifyReply) => {
    await requireAdmin(app, req, reply);
    const id = (req.params as any).id as string;
    const shadowbanned = Boolean((req.body as any)?.shadowbanned ?? true);
    const reason = String((req.body as any)?.reason ?? "policy");
    const user = await prisma.user.update({ where: { id }, data: { shadowbanned, shadowbanReason: shadowbanned ? reason : null } });
    return reply.send(ok({ user }));
  });
}
