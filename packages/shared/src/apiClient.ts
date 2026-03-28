import type { ApiEnvelope } from "./types.js";
export class ApiClient {
  constructor(private baseUrl: string) {}
  async get<T>(path: string): Promise<ApiEnvelope<T>> {
    const r = await fetch(this.baseUrl + path, { credentials: "include" });
    return r.json();
  }
  async post<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
    const r = await fetch(this.baseUrl + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  }
  async patch<T>(path: string, body?: unknown): Promise<ApiEnvelope<T>> {
    const r = await fetch(this.baseUrl + path, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: body ? JSON.stringify(body) : undefined,
    });
    return r.json();
  }
  async del<T>(path: string): Promise<ApiEnvelope<T>> {
    const r = await fetch(this.baseUrl + path, { method: "DELETE", credentials: "include" });
    return r.json();
  }
}
