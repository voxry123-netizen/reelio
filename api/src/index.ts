import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import helmet from "@fastify/helmet";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUI from "@fastify/swagger-ui";
import websocket from "@fastify/websocket";

import { env } from "./lib/env.js";
import { authPlugin } from "./lib/auth.js";
import { registerRoutes } from "./routes/index.js";
import { err, ok } from "./lib/envelope.js";
import { prisma } from "./lib/prisma.js";
import { requireAuth, setAuthCookies, clearAuthCookies } from "./lib/httpAuth.js";

const isDocker = process.env.DOCKER === "1";
  const isProd = process.env.NODE_ENV === "production";

  const app = Fastify({
  logger: isProd || isDocker
    ? { level: "info" }
    : { level: "info", transport: { target: "pino-pretty" } },
  bodyLimit: 200 * 1024 * 1024,
});

// ---- Decorations (typed via d.ts) ----
app.decorate("requireAuth", requireAuth);
app.decorate("setAuthCookies", function (reply: any, access: string, refresh: string) {
  return setAuthCookies(app, reply, access, refresh);
});
app.decorate("clearAuthCookies", function (reply: any) {
  return clearAuthCookies(reply);
});

// ---- Core plugins ----
await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
});

await app.register(cookie);
await app.register(helmet, {
  crossOriginResourcePolicy: { policy: "cross-origin" },
});
await app.register(rateLimit, { global: true, max: 200, timeWindow: "1 minute" });

// JWT plugin sets the signing secret + default expires for sign()
await app.register(jwt, {
  secret: env.JWT_ACCESS_SECRET,
  sign: { expiresIn: env.JWT_ACCESS_TTL_SECONDS },
});

// WebSocket plugin
await app.register(websocket);

// ---- Error handler ----
app.setErrorHandler((error: any, _req, reply) => {
  const status = error.statusCode ?? 500;
  const code = error.code ?? "INTERNAL_ERROR";
  const message = status >= 500 ? "Internal server error" : (error.message ?? "Error");
  const details = error.details;
  reply.status(status).send(err(code, message, details));
});

// ---- Swagger ----
await app.register(swagger, {
  openapi: {
    info: { title: "Reelio API", version: "0.0.1" },
  },
});
await app.register(swaggerUI, { routePrefix: "/docs" });

// ---- App plugins / routes ----
await app.register(authPlugin);
await registerRoutes(app);

// ---- Health ----
app.get("/health", async () => ok({ status: "ok" }));

// ---- WebSocket notifications channel (MVP) ----
// Auth strategy: read access_token cookie and verify it (no query token needed).
app.get("/ws", { websocket: true }, async (conn, req) => {
  let userId: string | null = null;

  try {
    // cookie plugin populates req.cookies
    const token = (req.cookies as any)?.access_token as string | undefined;
    if (token) {
      const payload = app.jwt.verify(token) as any;
      if (payload?.id) userId = String(payload.id);
    }
  } catch {
    // ignore invalid token, stay unauthenticated
    userId = null;
  }

  conn.socket.send(JSON.stringify({ type: "connected", userId }));

  const interval = setInterval(async () => {
    try {
      if (!userId) {
        conn.socket.send(JSON.stringify({ type: "unread", count: 0 }));
        return;
      }

      const count = await prisma.notification.count({ where: { userId, readAt: null } });
      conn.socket.send(JSON.stringify({ type: "unread", count }));
    } catch {
      // if db hiccup, don't kill socket; just skip this tick
    }
  }, 10000);

  conn.socket.on("close", () => clearInterval(interval));
});

// ---- Start ----
await app.listen({ port: env.API_PORT, host: env.API_HOST });