"use client";

import TopNav from "./TopNav";
import SideNav from "./SideNav";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="rm-app">
      <div className="rm-bg" aria-hidden="true" />
      <div className="rm-gridfx" aria-hidden="true" />
      <TopNav />
      <div className="rm-main">
        <SideNav />
        <main className="rm-content">
          <div className="rm-container">{children}</div>
        </main>
      </div>
    </div>
  );
}