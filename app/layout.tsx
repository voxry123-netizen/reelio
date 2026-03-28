import "./globals.css";
import React from "react";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { ModalProvider } from "./providers/ModalProvider";
import { AuthProvider } from "./providers/AuthProvider";
import AuthStatus from "./ui/AuthStatus";
import Link from "next/link";

export const metadata = {
  title: "REALM",
  description: "Reelio Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
            <ModalProvider>
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
                    </main>
                  </div>
                </div>
              </div>
            </ModalProvider>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

function TopBar() {
  return (
    <div className="fixed left-0 right-0 top-0 z-50 border-b border-border/60 bg-card/60 backdrop-blur">
      <div className="mx-auto flex max-w-[1300px] items-center justify-between px-4 py-3">
        <Link href="/" className="group flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-foreground text-background grid place-items-center font-black">
            R
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">REALM</div>
            <div className="text-xs text-muted">Modern social platform</div>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Link className="navlink" href="/feed/home">Feed</Link>
          <Link className="navlink" href="/feed/videos">Videos</Link>
          <Link className="navlink" href="/create">Create</Link>
          <Link className="navlink" href="/notifications">Notifications</Link>
          <Link className="navlink" href="/analytics">Analytics</Link>
          <Link className="navlink" href="/privacy">Privacy</Link>
          <Link className="navlink" href="/profile">Profile</Link>
          <AuthStatus />
        </div>
      </div>
    </div>
  );
}

function SideBar() {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 backdrop-blur p-4">
      <div className="text-xs font-semibold text-muted mb-3">ACTIVITY</div>
      <div className="space-y-2">
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="text-sm font-semibold">System</div>
          <div className="text-xs text-muted">All services online</div>
        </div>
        <div className="rounded-xl border border-border/60 bg-card/60 p-3">
          <div className="text-sm font-semibold">Tips</div>
          <div className="text-xs text-muted">Use the UI kit components for consistency.</div>
        </div>
      </div>
    </div>
  );
}