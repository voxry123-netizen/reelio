import type { FastifyInstance } from "fastify";
import { ok } from "../lib/envelope.js";

export async function liveRoutes(app: FastifyInstance) {
  // MVP scaffolding for live streaming
  app.post("/create", async (req) => {
    const u = await app.requireAuth(req);
    const streamKey = `live_${u.id}_${Date.now()}`;
    return ok({ streamKey, note: "MVP: RTMP ingest not implemented. Use this as placeholder." });
  });
}
