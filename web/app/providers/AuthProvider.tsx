"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, apiPost } from "../lib/api";

type RealmUser = {
  id: string;
  email: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  profile?: any;
  bio?: string | null;
} | null;

type AuthContextType = {
  user: RealmUser;
  loading: boolean;
  refreshMe: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthCtx = createContext<AuthContextType | null>(null);

async function fetchMe() {
  const res: any = await api("/users/me", { timeoutMs: 5000 });
  return res?.data?.user ?? null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<RealmUser>(null);
  const [loading, setLoading] = useState(true);

  const refreshMe = useCallback(async () => {
    setLoading(true);
    try {
      const me = await fetchMe();
      setUser(me);
      return;
    } catch (e: any) {
      const msg = String(e?.message || "").toLowerCase();
      const status = e?.status;
      const shouldTryRefresh = status === 401 || msg.includes("unauthorized") || msg.includes("token") || msg.includes("expired");

      if (shouldTryRefresh) {
        try {
          await apiPost("/auth/refresh", {});
          const me = await fetchMe();
          setUser(me);
          return;
        } catch {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const hardStop = setTimeout(() => {
      if (active) setLoading(false);
    }, 6500);

    refreshMe().finally(() => clearTimeout(hardStop));

    return () => {
      active = false;
      clearTimeout(hardStop);
    };
  }, [refreshMe]);

  const logout = useCallback(async () => {
    await apiPost("/auth/logout", {});
    setUser(null);
    setLoading(false);
  }, []);

  const value = useMemo(() => ({ user, loading, refreshMe, logout }), [user, loading, refreshMe, logout]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
