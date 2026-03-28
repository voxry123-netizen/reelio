import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { parseBody } from "../lib/http.js";
import { CommentCreateSchema, CommentUpdateSchema } from "../lib/schemas.js";

export async function engagementRoutes(app: FastifyInstance) {
  app.get("/comments/post/:postId", async (req, reply) => {
    const postId = (req.params as any).postId as string;
    const comments = await prisma.comment.findMany({
      where: { postId },
      orderBy: [{ createdAt: "asc" }],
      include: {
        author: { select: { id: true, username: true, displayName: true, avatarUrl: true, bio: true } },
      },
    });

    return reply.send(ok({ items: comments }));
  });

  // likes
  app.post("/likes/:postId", async (req, reply) => {
    const u = await app.requireAuth(req);
    const postId = (req.params as any).postId as string;
    const reaction = String(((req.body || {}) as any).reaction || "like");
    await prisma.like.upsert({
      where: { userId_postId: { userId: u.id, postId } },
      update: { reaction },
      create: { userId: u.id, postId, reaction },
    });

    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (post && post.authorId !== u.id) {
      await prisma.notification.create({ data: { userId: post.authorId, type: "like", payloadJson: { postId, fromUserId: u.id } } });
    }
    return reply.send(ok({ liked: true }));
  });

  app.delete("/likes/:postId", async (req, reply) => {
    const u = await app.requireAuth(req);
    const postId = (req.params as any).postId as string;
    await prisma.like.deleteMany({ where: { userId: u.id, postId } });
    return reply.send(ok({ liked: false }));
  });

  // comments
  app.post("/comments", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(CommentCreateSchema, req.body);
    const post = await prisma.post.findUnique({ where: { id: body.postId } });
    if (!post) return reply.status(404).send(err("NOT_FOUND", "Post not found"));

    const comment = await prisma.comment.create({
      data: { postId: body.postId, authorId: u.id, parentId: body.parentId ?? null, body: body.body },
    });

    if (post.authorId !== u.id) {
      await prisma.notification.create({ data: { userId: post.authorId, type: body.parentId ? "reply" : "comment", payloadJson: { postId: post.id, commentId: comment.id, fromUserId: u.id } } });
    }
    if (body.parentId) {
      const parent = await prisma.comment.findUnique({ where: { id: body.parentId } });
      if (parent && parent.authorId !== u.id && parent.authorId !== post.authorId) {
        await prisma.notification.create({ data: { userId: parent.authorId, type: "reply", payloadJson: { postId: post.id, commentId: comment.id, parentId: parent.id, fromUserId: u.id } } });
      }
    }
    return reply.send(ok({ comment }));
  });

  app.patch("/comments/:id", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const body = parseBody(CommentUpdateSchema, req.body);
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send(err("NOT_FOUND", "Comment not found"));
    if (existing.authorId !== u.id) return reply.status(403).send(err("FORBIDDEN", "Not your comment"));
    const comment = await prisma.comment.update({ where: { id }, data: { body: body.body } });
    return reply.send(ok({ comment }));
  });

  app.delete("/comments/:id", async (req, reply) => {
    const u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) return reply.status(404).send(err("NOT_FOUND", "Comment not found"));
    if (existing.authorId !== u.id) return reply.status(403).send(err("FORBIDDEN", "Not your comment"));
    await prisma.comment.delete({ where: { id } });
    return reply.send(ok({ deleted: true }));
  });

  // follows
  app.post("/follows/:userId", async (req, reply) => {
    const u = await app.requireAuth(req);
    const userId = (req.params as any).userId as string;
    if (userId === u.id) return reply.status(400).send(err("BAD_REQUEST", "Cannot follow yourself"));

    await prisma.follow.upsert({
      where: { followerId_followingId: { followerId: u.id, followingId: userId } },
      update: {},
      create: { followerId: u.id, followingId: userId },
    });

    await prisma.notification.create({ data: { userId, type: "follow", payloadJson: { fromUserId: u.id } } });
    return reply.send(ok({ following: true }));
  });

  app.delete("/follows/:userId", async (req, reply) => {
    const u = await app.requireAuth(req);
    const userId = (req.params as any).userId as string;
    await prisma.follow.deleteMany({ where: { followerId: u.id, followingId: userId } });
    return reply.send(ok({ following: false }));
  });
}
