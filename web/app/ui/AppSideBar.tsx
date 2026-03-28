"use client";

import { useLanguage } from "../providers/LanguageProvider";

export default function AppSideBar() {
  const { t } = useLanguage();

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur p-4">
      <div className="text-xs font-semibold text-muted mb-3">{t("activity")}</div>
      <div className="space-y-2">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="text-sm font-semibold">{t("system")}</div>
          <div className="text-xs text-muted">{t("allServicesOnline")}</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="text-sm font-semibold">{t("tips")}</div>
          <div className="text-xs text-muted">{t("uiKitTip")}</div>
        </div>
      </div>
    </div>
  );
}
