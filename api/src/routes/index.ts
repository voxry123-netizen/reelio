import type { FastifyInstance } from "fastify";

import { authRoutes } from "./auth.js";
import { userRoutes } from "./users.js";
import { realmRoutes } from "./realms.js";
import { postRoutes } from "./posts.js";
import { feedRoutes } from "./feeds.js";
import { engagementRoutes } from "./engagement.js";
import { notificationRoutes } from "./notifications.js";
import { uploadRoutes } from "./uploads.js";
import { monetizationRoutes } from "./monetization.js";
import { analyticsRoutes } from "./analytics.js";
import { privacyRoutes } from "./privacy.js";
import { adminRoutes } from "./admin.js";
import { liveRoutes } from "./live.js";
import { messageRoutes } from "./messages.js";

export async function registerRoutes(app: FastifyInstance) {
  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(userRoutes, { prefix: "/users" });
  await app.register(realmRoutes, { prefix: "/realms" });
  await app.register(postRoutes, { prefix: "/posts" });
  await app.register(feedRoutes, { prefix: "/feed" });
  await app.register(engagementRoutes, { prefix: "/" }); // likes/comments/follows
  await app.register(notificationRoutes, { prefix: "/notifications" });
  await app.register(uploadRoutes, { prefix: "/uploads" });
  await app.register(monetizationRoutes, { prefix: "/monetization" });
  await app.register(analyticsRoutes, { prefix: "/analytics" });
  await app.register(privacyRoutes, { prefix: "/privacy" });
  await app.register(adminRoutes, { prefix: "/admin" });
  await app.register(liveRoutes, { prefix: "/live" });
  await app.register(messageRoutes, { prefix: "/messages" });
}
