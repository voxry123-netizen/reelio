import "fastify";
import type { FastifyReply, FastifyRequest } from "fastify";

declare module "fastify" {
  interface FastifyInstance {
    requireAuth: (req: FastifyRequest) => Promise<{ id: string }>;
    setAuthCookies: (reply: FastifyReply, accessToken: string, refreshToken: string) => void;
    clearAuthCookies: (reply: FastifyReply) => void;
  }
}