"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/kit/Card";
import { Input } from "../ui/kit/Input";
import { Button } from "../ui/kit/Button";
import { apiPost } from "../lib/api";
import { useToast } from "../providers/ToastProvider";
import { useAuth } from "../providers/AuthProvider";
import { useLanguage } from "../providers/LanguageProvider";

export default function LoginPage() {
  const router = useRouter();
  const { push } = useToast();
  const { refreshMe } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("admin@reelio.local");
  const [password, setPassword] = useState("Admin123!ChangeMe");
  const [loading, setLoading] = useState(false);

  return (
    <div className="rm-center">
      <Card title={t("login")} subtitle={t("useRealSession")}>
        <div className="rm-form">
          <Input label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

          <Button
            loading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await apiPost("/api/auth/login", { email, password });
                await refreshMe();
                push("success", t("loggedIn"), "Your Reelio session is active.");
                router.push("/feed/home");
                router.refresh();
              } catch (e: any) {
                push("error", "Login failed", e?.message ?? String(e));
              } finally {
                setLoading(false);
              }
            }}
          >
            {t("login")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
