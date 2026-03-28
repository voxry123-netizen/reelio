import { z } from "zod";

const EnvSchema = z.object({
  API_PORT: z.coerce.number().int().default(3001),
  API_HOST: z.string().default("0.0.0.0"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().default(900),
  JWT_REFRESH_TTL_SECONDS: z.coerce.number().int().default(2592000),

  COOKIE_SECURE: z.coerce.boolean().default(false),
  COOKIE_DOMAIN: z.string().default("localhost"),

  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  REDIS_HOST: z.string().default("redis"),
  REDIS_PORT: z.coerce.number().int().default(6379),

  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_ACCESS_KEY: z.string().min(1),
  S3_SECRET_KEY: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_PUBLIC_URL: z.string().url(),

  AI_BASE_URL: z.string().url().default("http://ai:8000"),

  ADMIN_SEED_EMAIL: z.string().email().default("admin@reelio.local"),
  ADMIN_SEED_PASSWORD: z.string().min(8).default("Admin123!ChangeMe"),
});

export const env = EnvSchema.parse(process.env);
export type Env = typeof env;
