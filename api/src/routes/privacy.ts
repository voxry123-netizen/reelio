import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { exportQueue } from "../lib/queue.js";

export async function privacyRoutes(app: FastifyInstance) {
  app.get("/dashboard", async (req) => {
    const u = await app.requireAuth(req);
    const user = await prisma.user.findUnique({ where: { id: u.id }, select: { email: true, username: true, createdAt: true, shadowbanned: true, mfaEnabled: true } });
    const exports = await prisma.dataExport.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 10 });
    return ok({ user, exports });
  });

  app.post("/export/request", async (req, reply) => {
    const u = await app.requireAuth(req);
    const exp = await prisma.dataExport.create({ data: { userId: u.id, status: "queued" } });
    await exportQueue.add("data-export", { exportId: exp.id });
    return reply.send(ok({ exportId: exp.id, status: "queued" }));
  });

  app.get("/export/:id/status", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const exp = await prisma.dataExport.findUnique({ where: { id } });
    if (!exp || exp.userId !== u.id) return reply.status(404).send(err("NOT_FOUND", "Export not found"));
    return reply.send(ok({ export: exp }));
  });
}
