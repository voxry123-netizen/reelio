"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Dashboard" },
  { href: "/feed/home", label: "Feed Home" },
  { href: "/feed/following", label: "Following" },
  { href: "/feed/videos", label: "Videos" },
  { href: "/profile", label: "Profile" },
  { href: "/realms", label: "Realms" },
  { href: "/create", label: "Create" },
  { href: "/notifications", label: "Notifications" },
  { href: "/analytics", label: "Analytics" },
  { href: "/privacy", label: "Privacy" },
];

export default function SideNav() {
  const p = usePathname();

  return (
    <aside className="rm-sidenav">
      <div className="rm-sidenav-card">
        <div className="rm-sidenav-title">Navigation</div>
        <nav className="rm-sidenav-links">
          {items.map((it) => {
            const active = p === it.href || (it.href !== "/" && p?.startsWith(it.href));
            return (
              <Link key={it.href} href={it.href} className={`rm-sidenav-link ${active ? "is-active" : ""}`}>
                <span className="rm-bullet" />
                {it.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="rm-sidenav-card rm-sidenav-footer">
        <div className="rm-micro-title">Cyber Elegant</div>
        <div className="rm-micro-sub">Glow subtle • blur fine • UX clean</div>
      </div>
    </aside>
  );
}