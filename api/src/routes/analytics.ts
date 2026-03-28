import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/envelope.js";

export async function analyticsRoutes(app: FastifyInstance) {
  app.post("/view", async (req, reply) => {
    const viewerId = (req as any).user?.id ?? null;
    const body = req.body as any;
    const postId = body.postId as string;
    const watchMs = Number(body.watchMs ?? 0);
    const sessionId = String(body.sessionId ?? "anon");

    await prisma.postView.create({
      data: { postId, userId: viewerId, sessionId, watchMs },
    });
    return reply.send(ok({ tracked: true }));
  });

  app.get("/creator", async (req) => {
    const u = await app.requireAuth(req);
    const from = (req.query as any).from ? new Date((req.query as any).from) : new Date(Date.now() - 7 * 86400000);
    const to = (req.query as any).to ? new Date((req.query as any).to) : new Date();

    const posts = await prisma.post.findMany({ where: { authorId: u.id }, select: { id: true } });
    const postIds = posts.map(p => p.id);

    const views = await prisma.postView.aggregate({ where: { postId: { in: postIds }, createdAt: { gte: from, lte: to } }, _sum: { watchMs: true }, _count: { _all: true } });
    const likes = await prisma.like.count({ where: { postId: { in: postIds }, createdAt: { gte: from, lte: to } } });
    const comments = await prisma.comment.count({ where: { postId: { in: postIds }, createdAt: { gte: from, lte: to } } });
    const followersGained = await prisma.follow.count({ where: { followingId: u.id, createdAt: { gte: from, lte: to } } });

    const avgWatch = views._count._all ? Math.round((views._sum.watchMs ?? 0) / views._count._all) : 0;
    const viralScore = Math.min(100, Math.round((likes * 2 + comments * 3 + followersGained * 5 + avgWatch / 100) / 2));

    return ok({
      range: { from, to },
      metrics: {
        views: views._count._all,
        totalWatchMs: views._sum.watchMs ?? 0,
        avgWatchMs: avgWatch,
        likes,
        comments,
        followersGained,
        viralScore,
      },
    });
  });
}
