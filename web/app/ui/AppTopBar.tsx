"use client";

import Link from "next/link";
import AuthStatus from "./AuthStatus";
import LanguageSwitcher from "./LanguageSwitcher";
import { useLanguage } from "../providers/LanguageProvider";

export default function AppTopBar() {
  const { t } = useLanguage();

  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1300px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground font-black text-background">R</div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Reelio</div>
            <div className="text-xs text-muted">{t("brandSubtitle")}</div>
          </div>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-2 flex-wrap">
          <Link className="navlink" href="/feed/home">{t("feed")}</Link>
          <Link className="navlink" href="/feed/videos">{t("videos")}</Link>
          <Link className="navlink" href="/create">{t("create")}</Link>
          <Link className="navlink" href="/notifications">{t("notifications")}</Link>
          <Link className="navlink" href="/analytics">{t("analytics")}</Link>
          <Link className="navlink" href="/privacy">{t("privacy")}</Link>
          <Link className="navlink" href="/profile">{t("profile")}</Link>
          <AuthStatus />
          <LanguageSwitcher />
        </div>
      </div>
    </div>
  );
}
