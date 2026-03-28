
import type { FastifyInstance } from "fastify";
import argon2 from "argon2";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { ok, err } from "../lib/envelope.js";
import { parseQuery } from "../lib/http.js";
import { CursorSchema } from "../lib/schemas.js";

const LOCAL_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const PROFILE_PREFIX = "__REALM_PROFILE__";

type Visibility = "public" | "friends" | "private";

type ProfileState = {
  bio?: string;
  origin?: string;
  work?: string;
  studies?: string;
  activities?: string[];
  avatarFocusX?: number;
  avatarFocusY?: number;
  avatarZoom?: number;
  avatarFilter?: string;
  coverUrl?: string;
  visibility?: {
    origin?: Visibility;
    work?: Visibility;
    studies?: Visibility;
    activities?: Visibility;
  };
};

function parseProfileState(raw: string | null | undefined): ProfileState {
  if (!raw) return {};
  if (!raw.startsWith(PROFILE_PREFIX)) return { bio: raw };
  try {
    return JSON.parse(raw.slice(PROFILE_PREFIX.length)) || {};
  } catch {
    return {};
  }
}

function serializeProfileState(state: ProfileState) {
  return PROFILE_PREFIX + JSON.stringify(state);
}

function extensionFromContentType(contentType: string, filename = "") {
  const ext = path.extname(filename || "").toLowerCase();
  if (/^\.[a-z0-9]{1,8}$/i.test(ext)) return ext;
  if (contentType === "image/png") return ".png";
  if (contentType === "image/webp") return ".webp";
  if (contentType === "image/gif") return ".gif";
  return ".jpg";
}

async function saveBase64File(userId: string, contentType: string, dataBase64: string, originalFilename = "") {
  await fs.mkdir(LOCAL_UPLOAD_DIR, { recursive: true });
  const ext = extensionFromContentType(contentType, originalFilename);
  const storedFilename = `${userId}-${randomUUID()}${ext}`;
  const absPath = path.join(LOCAL_UPLOAD_DIR, storedFilename);
  const base64Payload = dataBase64.includes(",") ? dataBase64.split(",").pop() ?? "" : dataBase64;
  await fs.writeFile(absPath, Buffer.from(base64Payload, "base64"));
  return `/uploads/local-media/${storedFilename}`;
}

async function areMutualFollowers(viewerId: string, targetId: string) {
  const [a, b] = await Promise.all([
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: targetId } } }),
    prisma.follow.findUnique({ where: { followerId_followingId: { followerId: targetId, followingId: viewerId } } }),
  ]);
  return Boolean(a && b);
}

function canSee(vis: Visibility | undefined, isSelf: boolean, isFriend: boolean) {
  const value = vis || "public";
  if (value === "public") return true;
  if (value === "private") return isSelf;
  return isSelf || isFriend;
}

function clampPercent(value: any, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function clampZoom(value: any, fallback: number) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(1, Math.min(3, n));
}

function sanitizeFilter(value: any) {
  const v = String(value || "none").trim();
  const allowed = new Set(["none", "grayscale(1)", "sepia(1)", "contrast(1.15)", "saturate(1.25)", "brightness(1.08)"]);
  return allowed.has(v) ? v : "none";
}


async function userStats(userId: string, viewerId?: string) {
  const [postsCount, followersCount, followingCount, likesReceived, viewerFollows] = await Promise.all([
    prisma.post.count({ where: { authorId: userId } }),
    prisma.follow.count({ where: { followingId: userId } }),
    prisma.follow.count({ where: { followerId: userId } }),
    prisma.like.count({ where: { post: { authorId: userId } } }),
    viewerId ? prisma.follow.findUnique({ where: { followerId_followingId: { followerId: viewerId, followingId: userId } } }) : Promise.resolve(null),
  ]);
  return { postsCount, followersCount, followingCount, likesReceived, viewerFollows: Boolean(viewerFollows) };
}

function exposedProfile(profile: ProfileState, isSelf: boolean, isFriend: boolean) {
  return {
    bio: profile.bio || "",
    origin: canSee(profile.visibility?.origin, isSelf, isFriend) ? profile.origin || "" : null,
    work: canSee(profile.visibility?.work, isSelf, isFriend) ? profile.work || "" : null,
    studies: canSee(profile.visibility?.studies, isSelf, isFriend) ? profile.studies || "" : null,
    activities: canSee(profile.visibility?.activities, isSelf, isFriend) ? (profile.activities || []) : null,
    avatarFocusX: clampPercent(profile.avatarFocusX, 50),
    avatarFocusY: clampPercent(profile.avatarFocusY, 50),
    avatarZoom: clampZoom(profile.avatarZoom, 1),
    avatarFilter: sanitizeFilter(profile.avatarFilter),
    coverUrl: profile.coverUrl || null,
    visibility: profile.visibility || {},
  };
}

export async function userRoutes(app: FastifyInstance) {
  app.get("/me", async (req, reply) => {
    const me = await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;

    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        mfaEnabled: true,
        shadowbanned: true,
        shadowbanReason: true,
        identityScore: true,
        reputationScore: true,
        createdAt: true,
      },
    });

    const profile = parseProfileState(user?.bio);
    const stats = userId ? await userStats(userId, userId) : null;
    return reply.send(ok({ user: user ? { ...user, bio: profile.bio || "", profile: exposedProfile(profile, true, false), stats } : null }));
  });

  app.patch("/me", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));

    const body = req.body as any;
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { bio: true } });
    const profile = parseProfileState(existing?.bio);
    if (body.bio !== undefined) profile.bio = String(body.bio || "").slice(0, 5000);
    if (body.origin !== undefined) profile.origin = String(body.origin || "").slice(0, 150);
    if (body.work !== undefined) profile.work = String(body.work || "").slice(0, 150);
    if (body.studies !== undefined) profile.studies = String(body.studies || "").slice(0, 150);
    if (body.activities !== undefined) profile.activities = Array.isArray(body.activities) ? body.activities.map((x: any) => String(x).slice(0, 60)).slice(0, 20) : [];
    if (body.avatarFocusX !== undefined) profile.avatarFocusX = clampPercent(body.avatarFocusX, 50);
    if (body.avatarFocusY !== undefined) profile.avatarFocusY = clampPercent(body.avatarFocusY, 50);
    if (body.avatarZoom !== undefined) profile.avatarZoom = clampZoom(body.avatarZoom, 1);
    if (body.avatarFilter !== undefined) profile.avatarFilter = sanitizeFilter(body.avatarFilter);
    if (body.coverUrl !== undefined) profile.coverUrl = String(body.coverUrl || "").slice(0, 500);
    if (body.visibility !== undefined && typeof body.visibility === "object") {
      profile.visibility = {
        origin: body.visibility.origin || profile.visibility?.origin || "public",
        work: body.visibility.work || profile.visibility?.work || "public",
        studies: body.visibility.studies || profile.visibility?.studies || "public",
        activities: body.visibility.activities || profile.visibility?.activities || "public",
      };
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        displayName: body.displayName,
        avatarUrl: body.avatarUrl,
        bio: serializeProfileState(profile),
      },
      select: { id: true, username: true, displayName: true, bio: true, avatarUrl: true, email: true },
    });

    return reply.send(ok({ user: { ...user, bio: profile.bio || "", profile: exposedProfile(profile, true, false) } }));
  });

  app.post("/me/avatar", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    const body = req.body as any;
    if (!body?.dataBase64 || !body?.contentType) return reply.status(400).send(err("BAD_REQUEST", "Missing image payload"));
    const avatarUrl = await saveBase64File(userId, String(body.contentType), String(body.dataBase64), String(body.filename || ""));
    const user = await prisma.user.update({ where: { id: userId }, data: { avatarUrl }, select: { id: true, avatarUrl: true } });
    return reply.send(ok({ user }));
  });


  app.post("/me/cover", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    const body = req.body as any;
    if (!body?.dataBase64 || !body?.contentType) return reply.status(400).send(err("BAD_REQUEST", "Missing image payload"));
    const coverUrl = await saveBase64File(userId, String(body.contentType), String(body.dataBase64), String(body.filename || ""));
    const existing = await prisma.user.findUnique({ where: { id: userId }, select: { bio: true } });
    const profile = parseProfileState(existing?.bio);
    profile.coverUrl = coverUrl;
    await prisma.user.update({ where: { id: userId }, data: { bio: serializeProfileState(profile) } });
    return reply.send(ok({ coverUrl }));
  });

  app.patch("/me/email", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    const body = req.body as any;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    const email = String(body?.email || "").trim().toLowerCase();
    if (!email || !email.includes("@")) return reply.status(400).send(err("BAD_REQUEST", "Invalid email"));
    const exists = await prisma.user.findFirst({ where: { email, NOT: { id: userId } }, select: { id: true } });
    if (exists) return reply.status(409).send(err("EMAIL_TAKEN", "Email already used"));
    const user = await prisma.user.update({ where: { id: userId }, data: { email }, select: { id: true, email: true } });
    return reply.send(ok({ user }));
  });

  app.patch("/me/password", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    const body = req.body as any;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    const currentPassword = String(body?.currentPassword || "");
    const newPassword = String(body?.newPassword || "");
    if (newPassword.length < 8) return reply.status(400).send(err("BAD_REQUEST", "New password must be at least 8 characters"));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send(err("NOT_FOUND", "User not found"));
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) return reply.status(401).send(err("INVALID_CREDENTIALS", "Current password is incorrect"));
    await prisma.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(newPassword) } });
    return reply.send(ok({ changed: true }));
  });

  app.post("/me/deactivate-temporary", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    await prisma.user.update({ where: { id: userId }, data: { shadowbanned: true, shadowbanReason: "temporary_deactivated" } });
    app.clearAuthCookies(reply);
    return reply.send(ok({ deactivated: true, temporary: true }));
  });

  app.post("/me/reactivate", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    await prisma.user.update({ where: { id: userId }, data: { shadowbanned: false, shadowbanReason: null } });
    return reply.send(ok({ reactivated: true }));
  });

  app.delete("/me", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    const body = (req.body || {}) as any;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return reply.status(404).send(err("NOT_FOUND", "User not found"));
    const currentPassword = String(body?.currentPassword || "");
    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) return reply.status(401).send(err("INVALID_CREDENTIALS", "Current password is incorrect"));
    await prisma.user.delete({ where: { id: userId } });
    app.clearAuthCookies(reply);
    return reply.send(ok({ deleted: true }));
  });


  app.get("/search", async (req, reply) => {
    const q = String((req.query as any)?.q || "").trim();
    const limit = Math.max(1, Math.min(Number((req.query as any)?.limit || 10), 20));
    if (!q) return reply.send(ok({ items: [] }));
    const items = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: "insensitive" } },
          { displayName: { contains: q, mode: "insensitive" } },
        ],
      },
      select: { id: true, username: true, displayName: true, avatarUrl: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return reply.send(ok({ items }));
  });

  app.get("/me/follows", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));
    const [followers, following] = await Promise.all([
      prisma.follow.findMany({ where: { followingId: userId }, include: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.follow.findMany({ where: { followerId: userId }, include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return reply.send(ok({ followers: followers.map((x) => x.follower), following: following.map((x) => x.following) }));
  });

  app.get("/:id/follows", async (req, reply) => {
    const userId = String((req.params as any)?.id || "");
    const [followers, following] = await Promise.all([
      prisma.follow.findMany({ where: { followingId: userId }, include: { follower: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.follow.findMany({ where: { followerId: userId }, include: { following: { select: { id: true, username: true, displayName: true, avatarUrl: true } } }, orderBy: { createdAt: "desc" }, take: 100 }),
    ]);
    return reply.send(ok({ followers: followers.map((x) => x.follower), following: following.map((x) => x.following) }));
  });

  app.get("/:id", async (req, reply) => {
    const id = (req.params as any).id as string;
    const viewerId = (req.user as any)?.id as string | undefined;
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        displayName: true,
        bio: true,
        avatarUrl: true,
        isVerified: true,
        identityScore: true,
        reputationScore: true,
        createdAt: true,
      },
    });
    if (!user) return reply.status(404).send(err("NOT_FOUND", "User not found"));
    const isSelf = viewerId === user.id;
    const isFriend = viewerId ? await areMutualFollowers(viewerId, user.id) : false;
    const profile = parseProfileState(user.bio);
    const stats = await userStats(user.id, viewerId);
    return reply.send(ok({ user: { ...user, bio: profile.bio || "", profile: exposedProfile(profile, isSelf, isFriend), isFriend, stats } }));
  });

  app.get("/:id/posts", async (req, reply) => {
    const q = parseQuery(CursorSchema, req.query);
    const limit = (q.limit ?? 20) as number;
    const cursor = q.cursor;
    const id = (req.params as any).id as string;

    const posts = await prisma.post.findMany({
      where: { authorId: id },
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      include: {
        media: { include: { renditions: true } },
        author: { select: { id: true, username: true, avatarUrl: true } },
        realm: { select: { id: true, slug: true, name: true } },
      },
    });

    const hasMore = posts.length > limit;
    const items = hasMore ? posts.slice(0, limit) : posts;
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return reply.send(ok({ items, nextCursor }));
  });


  app.get("/:id/likes", async (req, reply) => {
    const id = (req.params as any).id as string;
    const likes = await prisma.like.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        post: {
          include: {
            media: { include: { renditions: true } },
            author: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
            realm: { select: { id: true, slug: true, name: true } },
            _count: { select: { likes: true, comments: true } },
          },
        },
      },
    });
    return reply.send(ok({ items: likes.map((x) => x.post).filter(Boolean) }));
  });

  app.get("/:id/memory", async (req, reply) => {
    const id = (req.params as any).id as string;
    const events = await prisma.memoryEvent.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return reply.send(ok({ events }));
  });

  app.get("/me/identity-score", async (req, reply) => {
    await app.requireAuth(req);
    const userId = (req.user as any)?.id as string | undefined;
    if (!userId) return reply.status(401).send(err("UNAUTHORIZED", "Unauthorized"));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true, createdAt: true, reputationScore: true, identityScore: true },
    });

    return reply.send(ok({ identityScore: user?.identityScore ?? 0, factors: user }));
  });
}
