import type { ZodSchema } from "zod";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const res = schema.safeParse(body);
  if (!res.success) {
    const details = res.error.flatten();
    const e: any = new Error("Validation failed");
    e.statusCode = 400;
    e.code = "VALIDATION_ERROR";
    e.details = details;
    throw e;
  }
  return res.data;
}

export function parseQuery<T>(schema: ZodSchema<T>, query: unknown): T {
  const res = schema.safeParse(query);
  if (!res.success) {
    const details = res.error.flatten();
    const e: any = new Error("Validation failed");
    e.statusCode = 400;
    e.code = "VALIDATION_ERROR";
    e.details = details;
    throw e;
  }
  return res.data;
}
