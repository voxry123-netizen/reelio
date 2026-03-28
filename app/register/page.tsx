"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "../ui/kit/Card";
import { Input } from "../ui/kit/Input";
import { Button } from "../ui/kit/Button";
import { apiPost } from "../lib/api";
import { useToast } from "../providers/ToastProvider";
import { useAuth } from "../providers/AuthProvider";

export default function RegisterPage() {
  const router = useRouter();
  const { push } = useToast();
  const { refreshMe } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <div className="rm-center">
      <Card title="Create account" subtitle="Register a Reelio user and start posting.">
        <div className="rm-form">
          <Input label="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Input label="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
          <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} hint="Minimum 8 characters" />

          <Button
            loading={loading}
            onClick={async () => {
              setLoading(true);
              try {
                await apiPost("/api/auth/register", { email, username, password });
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
            Create account
          </Button>
        </div>
      </Card>
    </div>
  );
}
