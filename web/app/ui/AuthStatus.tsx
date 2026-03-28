"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../providers/AuthProvider";
import { useToast } from "../providers/ToastProvider";
import { useLanguage } from "../providers/LanguageProvider";
import { absoluteAssetUrl } from "../lib/api";

const PROFILE_PREFIX = "__REALM_PROFILE__";

function parseProfile(raw?: string | null) {
  if (!raw) return {} as any;
  if (!String(raw).startsWith(PROFILE_PREFIX)) return {} as any;
  try {
    return JSON.parse(String(raw).slice(PROFILE_PREFIX.length)) || {};
  } catch {
    return {} as any;
  }
}

function avatarVisualStyle(profile: any) {
  return {
    objectPosition: `${profile?.avatarFocusX ?? 50}% ${profile?.avatarFocusY ?? 50}%`,
    transform: `scale(${profile?.avatarZoom ?? 1})`,
    filter: profile?.avatarFilter || "none",
  };
}

export default function AuthStatus() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const { push } = useToast();
  const { t } = useLanguage();

  if (loading) return <div className="text-xs text-muted">{t("checkingSession")}</div>;

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link className="navlink" href="/login">{t("login")}</Link>
        <Link className="navlink" href="/register">{t("register")}</Link>
      </div>
    );
  }

  const avatar = absoluteAssetUrl(user.avatarUrl);
  const profile = (user as any)?.profile || parseProfile((user as any)?.bio);

  return (
    <div className="flex items-center gap-3">
      <Link href="/profile" className="flex items-center gap-3 rounded-full border border-border/60 bg-card/40 px-2 py-1">
        {avatar ? (
          <div className="h-9 w-9 overflow-hidden rounded-full">
            <img
              src={avatar}
              alt={user.username}
              className="h-9 w-9 rounded-full object-cover"
              style={avatarVisualStyle(profile)}
            />
          </div>
        ) : (
          <div className="grid h-9 w-9 place-items-center rounded-full bg-foreground text-background text-xs font-black">
            {user.username.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="text-right leading-tight">
          <div className="text-sm font-semibold">{user.displayName || user.username}</div>
        </div>
      </Link>
      <button
        className="navlink"
        onClick={async () => {
          try {
            await logout();
            push("success", t("logout"), "Session cleared successfully.");
            router.push("/login");
            router.refresh();
          } catch (e: any) {
            push("error", "Logout failed", e?.message ?? String(e));
          }
        }}
      >
        {t("logout")}
      </button>
    </div>
  );
}
