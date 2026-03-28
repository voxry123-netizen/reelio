import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { env } from "./env.js";

export function setAuthCookies(app: FastifyInstance, reply: FastifyReply, accessToken: string, refreshToken: string) {
  const secure = env.COOKIE_SECURE && process.env.NODE_ENV === "production";
  const common = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure,
    path: "/",
  };

  reply.setCookie("access_token", accessToken, {
    ...common,
    maxAge: env.JWT_ACCESS_TTL_SECONDS,
  });

  reply.setCookie("refresh_token", refreshToken, {
    ...common,
    maxAge: env.JWT_REFRESH_TTL_SECONDS,
  });
}

export function clearAuthCookies(reply: FastifyReply) {
  reply.clearCookie("access_token", { path: "/" });
  reply.clearCookie("refresh_token", { path: "/" });
}

/**
 * Guard pentru rute protejate.
 *
 * IMPORTANT:
 * - Acceptă doar `req` (fără `reply`) ca să evităm modificări în toate rutele.
 * - Dacă nu e autenticat, aruncă o eroare cu statusCode=401 (Fastify o prinde în error handler).
 * - Returnează obiectul user minim { id } pentru uz imediat în route handlers.
 */
export async function requireAuth(req: FastifyRequest): Promise<{ id: string }> {
  try {
    const cookies = (req as any).cookies as Record<string, string> | undefined;
    const tokenFromCookie = cookies?.access_token;

    // Dacă există cookie, îl punem ca Bearer, ca jwtVerify() să-l detecteze standard.
    if (tokenFromCookie) {
      (req as any).headers = {
        ...(req as any).headers,
        authorization: `Bearer ${tokenFromCookie}`,
      };
    }

    await req.jwtVerify();

    const payload = req.user as any;
    const id = payload?.id;

    if (!id) {
      const e: any = new Error("Unauthorized");
      e.statusCode = 401;
      e.code = "UNAUTHORIZED";
      throw e;
    }

    return { id: String(id) };
  } catch {
    const e: any = new Error("Unauthorized");
    e.statusCode = 401;
    e.code = "UNAUTHORIZED";
    throw e;
  }
}