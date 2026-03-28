import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok } from "../lib/envelope.js";
import { parseQuery } from "../lib/http.js";
import { CursorSchema } from "../lib/schemas.js";
import { env } from "../lib/env.js";

function isRevealed(revealAt: Date | null) {
  if (!revealAt) return true;
  return new Date() >= revealAt;
}

async function scoreWithAI(userId: string, posts: any[]) {
  try {
    const res = await fetch(env.AI_BASE_URL + "/score/feed", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId, candidates: posts.map(p => ({ id: p.id, createdAt: p.createdAt, realmId: p.realmId, authorId: p.authorId })) }),
    });
    if (!res.ok) throw new Error("AI not ok");
    const data = await res.json();
    const scores: Record<string, number> = data.scores ?? {};
    return posts
      .map(p => ({ p, s: scores[p.id] ?? 0 }))
      .sort((a,b) => b.s - a.s)
      .map(x => x.p);
  } catch {
    // fallback: newest first
    return posts.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function feedRoutes(app: FastifyInstance) {
  app.get("/home", async (req: any) => {
    const u = await app.requireAuth(req);
    const { limit, cursor } = parseQuery(CursorSchema, req.query) as { limit: number; cursor: string | null };

    const candidates = await prisma.post.findMany({
      where: {
        status: "published",
        visibility: "public",
        author: { shadowbanned: false },
        OR: [{ timeCapsuleRevealAt: null }, { timeCapsuleRevealAt: { lte: new Date() } }, { authorId: u.id }],
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(limit * 5, 200),
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { media: { include: { renditions: true } }, author: { select: { id: true, username: true, avatarUrl: true, bio: true } }, realm: { select: { id: true, slug: true, name: true } }, _count: { select: { likes: true, comments: true } } },
    });

    const ranked = await scoreWithAI(u.id, candidates);
    const items = ranked.slice(0, limit);
    const nextCursor = items.length ? items[items.length - 1].id : null;
    return ok({ items, nextCursor });
  });

  app.get("/following", async (req: any) => {
    const u = await app.requireAuth(req);
    const { limit, cursor } = parseQuery(CursorSchema, req.query) as { limit: number; cursor: string | null };

    const following = await prisma.follow.findMany({ where: { followerId: u.id }, select: { followingId: true } });
    const ids = following.map((f: { followingId: string }) => f.followingId);
    const posts = await prisma.post.findMany({
      where: {
        authorId: { in: ids.length ? ids : ["00000000-0000-0000-0000-000000000000"] },
        status: "published",
        visibility: "public",
        author: { shadowbanned: false },
        OR: [{ timeCapsuleRevealAt: null }, { timeCapsuleRevealAt: { lte: new Date() } }],
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { media: { include: { renditions: true } }, author: { select: { id: true, username: true, avatarUrl: true, bio: true } }, realm: { select: { id: true, slug: true, name: true } }, _count: { select: { likes: true, comments: true } } },
    });
    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;
    return ok({ items, nextCursor });
  });

  app.get("/videos", async (req: any) => {
    const u = await app.requireAuth(req);
    const { limit, cursor } = parseQuery(CursorSchema, req.query) as { limit: number; cursor: string | null };
    const posts = await prisma.post.findMany({
      where: {
        status: "published",
        visibility: "public",
        author: { shadowbanned: false },
        media: { some: { OR: [
          { storageKeyOriginal: { contains: ".mp4" } },
          { storageKeyOriginal: { contains: ".webm" } },
          { storageKeyOriginal: { contains: ".mov" } },
          { storageKeyOriginal: { contains: ".og" } }
        ] } },
        OR: [{ timeCapsuleRevealAt: null }, { timeCapsuleRevealAt: { lte: new Date() } }, { authorId: u.id }],
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { media: { include: { renditions: true } }, author: { select: { id: true, username: true, avatarUrl: true, bio: true } }, realm: { select: { id: true, slug: true, name: true } }, _count: { select: { likes: true, comments: true } } },
    });
    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;
    return ok({ items, nextCursor });
  });

  app.get("/realm/:slug", async (req: any) => {
    const u = await app.requireAuth(req);
    const { limit, cursor } = parseQuery(CursorSchema, req.query) as { limit: number; cursor: string | null };
    const slug = (req.params as any).slug as string;

    const realm = await prisma.realm.findUnique({ where: { slug } });
    if (!realm) return ok({ items: [], nextCursor: null });

    const posts = await prisma.post.findMany({
      where: {
        realmId: realm.id,
        status: "published",
        visibility: "public",
        author: { shadowbanned: false },
        OR: [{ timeCapsuleRevealAt: null }, { timeCapsuleRevealAt: { lte: new Date() } }, { authorId: u.id }],
      },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: { media: { include: { renditions: true } }, author: { select: { id: true, username: true, avatarUrl: true, bio: true } }, realm: { select: { id: true, slug: true, name: true } }, _count: { select: { likes: true, comments: true } } },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;
    return ok({ items, nextCursor });
  });
}
