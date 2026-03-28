import "./globals.css";
import React from "react";
import { ThemeProvider } from "./providers/ThemeProvider";
import { ToastProvider } from "./providers/ToastProvider";
import { ModalProvider } from "./providers/ModalProvider";
import { AuthProvider } from "./providers/AuthProvider";
import { LanguageProvider } from "./providers/LanguageProvider";
import AppShell from "./ui/AppShell";

export const metadata = {
  title: "Reelio",
  description: "Reelio Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <ToastProvider>
            <LanguageProvider>
              <AuthProvider>
                <ModalProvider>
                  <AppShell>{children}</AppShell>
                </ModalProvider>
              </AuthProvider>
            </LanguageProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}