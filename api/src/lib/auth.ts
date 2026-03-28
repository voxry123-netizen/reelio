import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function authPlugin(app: FastifyInstance) {
  // nu folosi decorateRequest("user") fiindcă e al fastify-jwt
  app.decorateRequest("authUser", undefined);

  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    // dacă ruta nu e protejată, nu face nimic (noi o folosim doar ca helper)
  });
}

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    // verifică token din cookie/authorization automat
    await req.jwtVerify();

    // payload-ul standard: { id: string, iat, exp }
    const payload = req.user as any;
    const id = payload?.id;

    if (!id) {
      return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Invalid token payload" } });
    }

    req.authUser = { id };
  } catch {
    return reply.status(401).send({ ok: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } });
  }
}

export function getAuthUserId(req: FastifyRequest) {
  return req.authUser?.id;
}