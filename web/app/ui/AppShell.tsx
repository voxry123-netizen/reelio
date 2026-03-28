"use client";

import React from "react";
import Link from "next/link";
import { useLanguage } from "../providers/LanguageProvider";
import AuthStatus from "./AuthStatus";
import LanguageSelector from "./LanguageSelector";
import PeopleSearch from "./PeopleSearch";
import FloatingMessagesDock from "./FloatingMessagesDock";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-app text-foreground">
      <div className="pointer-events-none fixed inset-0 opacity-80">
        <div className="absolute -top-32 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-ring/25 via-transparent to-transparent blur-3xl" />
        <div className="absolute -bottom-40 right-[-120px] h-[520px] w-[520px] rounded-full bg-gradient-to-br from-foreground/10 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="relative">
        <TopBar />
        <div className="mx-auto grid max-w-[1300px] grid-cols-12 gap-5 px-4 pb-10 pt-20">
          <aside className="col-span-12 lg:col-span-3">
            <SideBar />
          </aside>
          <main className="col-span-12 lg:col-span-9">
            {children}
            <FloatingMessagesDock />
          </main>
        </div>
      </div>
    </div>
  );
}

function TopBar() {
  const { t } = useLanguage();

  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1300px] items-center justify-between gap-4 px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-foreground text-background font-black">
            R
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">Reelio</div>
            <div className="text-xs text-muted">{t("brandSubtitle")}</div>
          </div>
        </Link>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
          <Link className="navlink" href="/feed/home">
            {t("feed")}
          </Link>
          <Link className="navlink" href="/feed/videos">
            {t("videos")}
          </Link>
          <Link className="navlink" href="/create">
            {t("create")}
          </Link>
          <Link className="navlink" href="/notifications">
            {t("notifications")}
          </Link>
          <PeopleSearch />
          <AuthStatus />
          <LanguageSelector />
        </div>
      </div>
    </div>
  );
}

function SideBar() {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur p-4">
      <div className="mb-3 text-xs font-semibold text-muted">{t("activity")}</div>
      <div className="space-y-2">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="text-sm font-semibold">{t("system")}</div>
          <div className="text-xs text-muted">{t("allServicesOnline")}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="text-sm font-semibold">{t("tips")}</div>
          <div className="text-xs text-muted">{t("uiConsistency")}</div>
        </div>
      </div>
    </div>
  );
}