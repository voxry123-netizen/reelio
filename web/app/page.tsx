"use client";

import Link from "next/link";
import { Card } from "./ui/kit/Card";
import { Button } from "./ui/kit/Button";
import { Badge } from "./ui/kit/Badge";
import { useLanguage } from "./providers/LanguageProvider";

export default function HomePage() {
  const { t } = useLanguage();
  return (
    <div className="rm-stack">
      <Card>
        <div className="rm-card-head">
          <div>
            <div className="rm-card-title">Reelio</div>
            <div className="rm-muted">{t("brandSubtitle")}</div>
          </div>

          <Badge variant="success">ONLINE</Badge>
        </div>

        <div className="rm-card-body">
          <div className="rm-muted" style={{ marginBottom: 12 }}>
            Use Register/Login, then open Feed and Create a Post. API docs at{" "}
            <span style={{ color: "var(--txt)" }}>/docs</span>.
          </div>

          <div className="rm-row" style={{ flexWrap: "wrap" }}>
            <Link href="/login">
              <Button>{t("login")}</Button>
            </Link>

            <Link href="/feed/home">
              <Button variant="ghost">{t("openFeed")}</Button>
            </Link>

            <Link href="/create">
              <Button variant="danger">{t("createPost")}</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}