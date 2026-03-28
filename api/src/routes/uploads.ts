import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { parseBody } from "../lib/http.js";
import { UploadRequestSchema, UploadConfirmSchema, LocalMediaUploadSchema } from "../lib/schemas.js";
import { presignPut, presignGet } from "../lib/s3.js";
import { transcodeQueue } from "../lib/queue.js";
import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");

function safeExtFromFilename(filename: string) {
  const ext = path.extname(filename || "").toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/i.test(ext)) return ext;
  return "";
}

function extensionFromContentType(contentType: string, filename = "") {
  const preferred = safeExtFromFilename(filename);
  if (preferred) return preferred;
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  if (contentType === "video/mp4") return ".mp4";
  if (contentType === "video/webm") return ".webm";
  if (contentType === "video/ogg") return ".ogv";
  if (contentType === "video/quicktime") return ".mov";
  return ".jpg";
}

function contentTypeFromExtension(filename: string) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".mp4") return "video/mp4";
  if (ext === ".webm") return "video/webm";
  if (ext === ".ogv" || ext === ".ogg") return "video/ogg";
  if (ext === ".mov") return "video/quicktime";
  return "image/jpeg";
}

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/request", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(UploadRequestSchema, req.body);

    const key = `uploads/${u.id}/${randomUUID()}-${body.filename}`;
    const url = await presignPut(key, body.contentType);
    return reply.send(ok({ key, url, method: "PUT" }));
  });

  app.post("/confirm", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(UploadConfirmSchema, req.body);

    const post = await prisma.post.findUnique({ where: { id: body.postId } });
    if (!post) return reply.status(404).send(err("NOT_FOUND", "Post not found"));
    if (post.authorId !== u.id) return reply.status(403).send(err("FORBIDDEN", "Not your post"));

    const media = await prisma.media.create({
      data: {
        postId: post.id,
        storageKeyOriginal: body.storageKey,
        durationSec: body.durationSec ?? null,
        width: body.width ?? null,
        height: body.height ?? null,
        sizeBytes: body.sizeBytes ?? null,
        codec: null,
      },
    });

    await prisma.post.update({ where: { id: post.id }, data: { status: "published" } });

    await transcodeQueue.add("transcode", { mediaId: media.id });
    return reply.send(ok({ mediaId: media.id, queued: true }));
  });

  app.post("/local-media", async (req, reply) => {
    const u = await app.requireAuth(req);
    const body = parseBody(LocalMediaUploadSchema, req.body);

    const post = await prisma.post.findUnique({ where: { id: body.postId } });
    if (!post) return reply.status(404).send(err("NOT_FOUND", "Post not found"));
    if (post.authorId !== u.id) return reply.status(403).send(err("FORBIDDEN", "Not your post"));

    await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
    const ext = extensionFromContentType(body.contentType, body.filename);
    const filename = `${u.id}-${randomUUID()}${ext}`;
    const absPath = path.join(LOCAL_UPLOAD_DIR, filename);
    const base64Payload = body.dataBase64.includes(",") ? body.dataBase64.split(",").pop() ?? "" : body.dataBase64;
    const buffer = Buffer.from(base64Payload, "base64");
    await fs.writeFile(absPath, buffer);

    const publicPath = `/uploads/local-media/${filename}`;

    const media = await prisma.media.create({
      data: {
        postId: post.id,
        storageKeyOriginal: publicPath,
        width: body.width ?? null,
        height: body.height ?? null,
        sizeBytes: body.sizeBytes ?? buffer.byteLength,
      },
    });

    await prisma.post.update({ where: { id: post.id }, data: { status: "published" } });

    return reply.send(ok({ mediaId: media.id, url: publicPath }));
  });

  app.get("/local-media/:filename", async (req, reply) => {
    const filename = String((req.params as any).filename || "");
    if (!/^[a-zA-Z0-9._-]+$/.test(filename)) {
      return reply.status(400).send(err("BAD_REQUEST", "Invalid file name"));
    }

    const absPath = path.join(LOCAL_UPLOAD_DIR, filename);
    try {
      const file = await fs.readFile(absPath);
      reply.header("content-type", contentTypeFromExtension(filename));
      reply.header("cache-control", "public, max-age=31536000, immutable");
      return reply.send(file);
    } catch {
      return reply.status(404).send(err("NOT_FOUND", "File not found"));
    }
  });

  app.get("/media/:id/signed-url", async (req, reply) => {
    const _u = await app.requireAuth(req);
    const id = (req.params as any).id as string;
    const media = await prisma.media.findUnique({ where: { id }, include: { renditions: true } });
    if (!media) return reply.status(404).send(err("NOT_FOUND", "Media not found"));

    const key = media.renditions[0]?.storageKey ?? media.storageKeyOriginal;
    if (key.startsWith("/uploads/local-media/")) {
      return reply.send(ok({ url: key }));
    }

    const url = await presignGet(key);
    return reply.send(ok({ url }));
  });
}
