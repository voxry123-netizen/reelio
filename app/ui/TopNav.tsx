"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useTheme } from "../providers/ThemeProvider";

export default function TopNav() {
  const { theme, toggle } = useTheme();
  const [apiOk, setApiOk] = useState<boolean | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("http://localhost:3001/health", { credentials: "include" });
        setApiOk(r.ok);
      } catch {
        setApiOk(false);
      }
    })();
  }, []);

  return (
    <header className="rm-topnav">
      <div className="rm-topnav-inner">
        <Link href="/" className="rm-brand">
          <span className="rm-brand-dot" />
          REALM
          <span className="rm-brand-glow" />
        </Link>

        <div className="rm-top-actions">
          <a className="rm-pill" href="http://localhost:3001/docs" target="_blank" rel="noreferrer">Swagger</a>

          <div className={`rm-status ${apiOk === null ? "is-wait" : apiOk ? "is-ok" : "is-bad"}`}>
            <span className="rm-status-dot" />
            {apiOk === null ? "Checking" : apiOk ? "API Online" : "API Down"}
          </div>

          <button className="rm-iconbtn rm-soft" onClick={toggle} title="Toggle theme">
            {theme === "dark" ? "☾" : "☀"}
          </button>

          <Link className="rm-btn rm-btn-ghost rm-btn-sm" href="/login">Login</Link>
          <Link className="rm-btn rm-btn-sm" href="/register">Register</Link>
        </div>
      </div>
    </header>
  );
}