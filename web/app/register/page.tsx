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

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const { refreshMe } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="rm-center">
      <Card title={t("createAccount")} subtitle={t("accountCreated")}>
        <div className="rm-form">
          <Input label={t("email")} value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label={t("username")} value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label={t("password")} type="password" value={password} onChange={(e) => setPassword(e.target.value)} hint={t("minimum8")} />

          <Button
            loading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await apiPost("/auth/register", { email, username, password });
                await refreshMe();
                push("success", "Account created", "You are now logged in.");
                router.push("/feed/home");
                router.refresh();
              } catch (e: any) {
                push("error", "Register failed", e?.message ?? String(e));
              } finally {
                setLoading(false);
              }
            }}
          >
            {t("createAccount")}
          </Button>
        </div>
      </Card>
    </div>
  );
}
