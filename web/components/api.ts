export const API = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";

export async function apiGet<T>(path: string): Promise<T> {
  const r = await fetch(API + path, { credentials: "include", cache: "no-store" });
  return r.json();
}

export async function apiPost<T>(path: string, body?: any): Promise<T> {
  const r = await fetch(API + path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  return r.json();
}
