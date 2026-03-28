import { z } from "zod";
export const zEmail = z.string().email().max(255);
export const zUsername = z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/);
export const RegisterSchema = z.object({ email: zEmail, username: zUsername, password: z.string().min(8).max(200) });
export const LoginSchema = z.object({ email: zEmail, password: z.string().min(8).max(200) });
export const CreateRealmSchema = z.object({
  slug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/),
  name: z.string().min(3).max(80),
  description: z.string().max(500).optional()
});
export const CreatePostSchema = z.object({
  realmSlug: z.string().min(3).max(40).regex(/^[a-z0-9-]+$/).optional(),
  title: z.string().min(1).max(120),
  caption: z.string().max(2000).optional(),
  visibility: z.enum(["public","unlisted","private"]).default("public"),
  timeCapsuleRevealAt: z.string().datetime().optional(),
  scheduledAt: z.string().datetime().optional(),
});
export const UploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().min(3).max(100),
  postId: z.string().uuid().optional()
});
export const UploadConfirmSchema = z.object({
  postId: z.string().uuid(),
  storageKey: z.string().min(5),
  durationSec: z.number().int().nonnegative().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
});
export const CommentCreateSchema = z.object({
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  body: z.string().min(1).max(2000),
});
export const CommentUpdateSchema = z.object({ body: z.string().min(1).max(2000) });
export const TipSchema = z.object({ toUserId: z.string().uuid(), amountCents: z.number().int().min(50).max(50000), postId: z.string().uuid().optional() });
export const CursorSchema = z.object({ cursor: z.string().optional(), limit: z.coerce.number().int().min(1).max(50).default(20) });
