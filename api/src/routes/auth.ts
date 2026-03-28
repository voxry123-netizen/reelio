import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import argon2 from "argon2";
import { prisma } from "../lib/prisma.js";
import { env } from "../lib/env.js";
import { ok, err } from "../lib/envelope.js";
import { parseBody } from "../lib/http.js";
import { RegisterSchema, LoginSchema } from "../lib/schemas.js";
import { hashToken, randomToken } from "../lib/tokens.js";

function nowPlusSeconds(sec: number) {
  return new Date(Date.now() + sec * 1000);
}

export async function authRoutes(app: FastifyInstance) {
  app.post("/register", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = parseBody(RegisterSchema, req.body) as { email: string; username: string; password: string };

    const existsEmail = await prisma.user.findUnique({ where: { email: body.email } });
    if (existsEmail) return reply.status(409).send(err("EMAIL_TAKEN", "Email already used"));

    const existsUser = await prisma.user.findUnique({ where: { username: body.username } });
    if (existsUser) return reply.status(409).send(err("USERNAME_TAKEN", "Username already used"));

    const passwordHash = await argon2.hash(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        username: body.username,
        passwordHash,
      },
      select: { id: true, email: true, username: true, createdAt: true },
    });

    const access = app.jwt.sign({ id: user.id }, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });

    // Refresh token = opaque random string stored hashed in DB (rotation supported)
    const refreshRaw = randomToken();
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshRaw), expiresAt: nowPlusSeconds(env.JWT_REFRESH_TTL_SECONDS) },
    });

    app.setAuthCookies(reply, access, refreshRaw);
    return reply.send(ok({ user }));
  });

  app.post("/login", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = parseBody(LoginSchema, req.body) as { email: string; password: string };

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user) return reply.status(401).send(err("INVALID_CREDENTIALS", "Invalid credentials"));

    const valid = await argon2.verify(user.passwordHash, body.password);
    if (!valid) return reply.status(401).send(err("INVALID_CREDENTIALS", "Invalid credentials"));
    if (user.shadowbanned && (user.shadowbanReason === "temporary_deactivated" || user.shadowbanReason === "permanent_deactivated")) {
      return reply.status(403).send(err("ACCOUNT_DEACTIVATED", "This account is deactivated"));
    }

    const access = app.jwt.sign({ id: user.id }, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });

    // rotate: create a new refresh token every login
    const refreshRaw = randomToken();
    await prisma.refreshToken.create({
      data: { userId: user.id, tokenHash: hashToken(refreshRaw), expiresAt: nowPlusSeconds(env.JWT_REFRESH_TTL_SECONDS) },
    });

    app.setAuthCookies(reply, access, refreshRaw);
    return reply.send(ok({ user: { id: user.id, email: user.email, username: user.username } }));
  });

  app.post("/refresh", async (req: FastifyRequest, reply: FastifyReply) => {
    const refreshRaw = (req.cookies as any)?.refresh_token as string | undefined;
    if (!refreshRaw) return reply.status(401).send(err("NO_REFRESH", "Missing refresh token"));

    // Find active refresh token
    const tokenHash = hashToken(refreshRaw);
    const found = await prisma.refreshToken.findFirst({
      where: { tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
    });

    if (!found) return reply.status(401).send(err("INVALID_REFRESH", "Invalid refresh token"));

    // Revoke old token (rotation)
    await prisma.refreshToken.update({ where: { id: found.id }, data: { revokedAt: new Date() } });

    // Issue new tokens
    const access = app.jwt.sign({ id: found.userId }, { expiresIn: env.JWT_ACCESS_TTL_SECONDS });

    const newRefreshRaw = randomToken();
    await prisma.refreshToken.create({
      data: { userId: found.userId, tokenHash: hashToken(newRefreshRaw), expiresAt: nowPlusSeconds(env.JWT_REFRESH_TTL_SECONDS) },
    });

    app.setAuthCookies(reply, access, newRefreshRaw);
    return reply.send(ok({ refreshed: true }));
  });

  app.post("/logout", async (_req: FastifyRequest, reply: FastifyReply) => {
    app.clearAuthCookies(reply);
    return reply.send(ok({ loggedOut: true }));
  });

  // MFA MVP placeholder: enable returns secret; verify expected token
  app.post("/mfa/enable", { preHandler: app.requireAuth }, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(ok({ enabled: false, note: "MFA not implemented in MVP build" }));
  });

  app.post("/mfa/verify", { preHandler: app.requireAuth }, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(ok({ verified: false, note: "MFA not implemented in MVP build" }));
  });

  app.post("/mfa/disable", { preHandler: app.requireAuth }, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send(ok({ disabled: true, note: "MFA not implemented in MVP build" }));
  });
}
