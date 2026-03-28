export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:3001";
const DEFAULT_TIMEOUT_MS = 8000;

function mergeHeaders(opts?: RequestInit) {
  const headers = new Headers(opts?.headers || undefined);
  if (!headers.has("Accept")) headers.set("Accept", "application/json");
  return headers;
}

export async function api<T = any>(path: string, opts?: RequestInit & { timeoutMs?: number }): Promise<T> {
  const controller = new AbortController();
  const timeoutMs = opts?.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const r = await fetch(`${API_BASE}${path}`, {
      credentials: "include",
      ...opts,
      headers: mergeHeaders(opts),
      signal: opts?.signal ?? controller.signal,
    });

    const text = await r.text();
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!r.ok) {
      const msg = data?.error?.message || data?.message || `HTTP ${r.status}`;
      const error: any = new Error(msg);
      error.status = r.status;
      error.payload = data;
      throw error;
    }

    return data as T;
  } catch (e: any) {
    if (e?.name === "AbortError") {
      throw new Error("Request timed out. Check whether the API is running.");
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function apiPost<T = any>(path: string, body?: any) {
  return api<T>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : "{}",
  });
}

export function apiPatch<T = any>(path: string, body: any) {
  return api<T>(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function apiDelete<T = any>(path: string, body?: any) {
  return api<T>(
    path,
    body === undefined
      ? { method: "DELETE" }
      : {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
  );
}

export function absoluteAssetUrl(url?: string | null) {
  if (!url) return null;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE}${url}`;
  return `${API_BASE}/${url.replace(/^\/+/, "")}`;
}
