"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await api("/analytics/creator"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="rm-stack">
      <div className="rm-card">
        <div className="rm-card-head">
          <div className="rm-card-title">Analytics / Creator</div>
        </div>

        <div className="rm-card-body">
          {loading ? (
            <div className="rm-muted" style={{ minHeight: 180 }}>
              Loading…
            </div>
          ) : (
            <pre className="rm-pre">{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      </div>
    </div>
  );
}