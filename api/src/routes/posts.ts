import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { parseBody } from "../lib/http.js";
import { CreatePostSchema } from "../lib/schemas.js";

function canViewTimeCapsule(now: Date, revealAt: Date | null, viewerId: string | null, authorId: string) {
  if (!revealAt) return true;
  if (now >= revealAt) return true;
  if (viewerId && viewerId === authorId) return true;
  return false;
}

export async function postRoutes(app: FastifyInstance) {
  app.post("/", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(CreatePostSchema, req.body);

    let realmId: string | null = null;
    if (body.realmSlug) {
      const realm = await prisma.realm.findUnique({ where: { slug: body.realmSlug } });
      if (!realm) return reply.status(404).send(err("REALM_NOT_FOUND", "Realm not found"));
      realmId = realm.id;
    }

    const post = await prisma.post.create({
      data: {
        authorId: u.id,
        realmId,
        title: body.title,
        caption: body.caption,
        visibility: body.visibility,
        scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
        timeCapsuleRevealAt: body.timeCapsuleRevealAt ? new Date(body.timeCapsuleRevealAt) : null,
        status: "published",
      },
    });

    await prisma.memoryEvent.create({ data: { userId: u.id, type: "post_created", refId: post.id } });

    return reply.send(ok({ post }));
  });

  app.get("/:id", async (req, reply) => {
    const viewerId = (req as any).user?.id ?? null;
    const id = (req.params as any).id as string;
    const post = await prisma.post.findUnique({
      where: { id },
      include: { media: { include: { renditions: true } }, author: { select: { id: true, username: true, shadowbanned: true, avatarUrl: true, bio: true } }, realm: { select: { id: true, slug: true, name: true } }, _count: { select: { likes: true, comments: true } } },
    });
    if (!post) return reply.status(404).send(err("NOT_FOUND", "Post not found"));

    // shadowban rules: if author shadowbanned, only author or admin can see in general; but direct view allowed
    const now = new Date();
    if (!canViewTimeCapsule(now, post.timeCapsuleRevealAt, viewerId, post.authorId)) {
      return reply.send(ok({ locked: true, reason: "time_capsule" }));
    }

    return reply.send(ok({ post }));
  });

  app.patch("/:id", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return reply.status(404).send(err("NOT_FOUND", "Post not found"));
    if (post.authorId !== u.id) return reply.status(403).send(err("FORBIDDEN", "Not your post"));

    const body = req.body as any;
    const updated = await prisma.post.update({
      where: { id },
      data: {
        title: body.title ?? post.title,
        caption: body.caption ?? post.caption,
        visibility: body.visibility ?? post.visibility,
        timeCapsuleRevealAt: body.timeCapsuleRevealAt ? new Date(body.timeCapsuleRevealAt) : post.timeCapsuleRevealAt,
      },
    });
    return reply.send(ok({ post: updated }));
  });

  app.delete("/:id", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const post = await prisma.post.findUnique({ where: { id } });
    if (!post) return reply.status(404).send(err("NOT_FOUND", "Post not found"));
    if (post.authorId !== u.id) return reply.status(403).send(err("FORBIDDEN", "Not your post"));
    await prisma.post.delete({ where: { id } });
    return reply.send(ok({ deleted: true }));
  });
}
