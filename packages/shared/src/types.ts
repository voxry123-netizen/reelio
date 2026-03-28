export type ApiEnvelopeOk<T> = { ok: true; data: T };
export type ApiEnvelopeErr = { ok: false; error: { code: string; message: string; details?: unknown } };
export type ApiEnvelope<T> = ApiEnvelopeOk<T> | ApiEnvelopeErr;
export type CursorPage<T> = { items: T[]; nextCursor?: string | null };
export type PostVisibility = "public" | "unlisted" | "private";
export type RealmRole = "owner" | "admin" | "mod" | "member";
