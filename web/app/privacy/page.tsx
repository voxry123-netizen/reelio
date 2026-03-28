"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/kit/Card";
import { Skeleton } from "../ui/kit/Skeleton";
import { api } from "../lib/api";

export default function PrivacyPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        setData(await api("/privacy/dashboard"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <Card>
      <div className="rm-card-head">
        <div className="rm-card-title">Privacy / Dashboard</div>
      </div>

      <div className="rm-card-body">
        {loading ? (
          <Skeleton h={180} />
        ) : (
          <pre className="rm-pre">{JSON.stringify(data, null, 2)}</pre>
        )}
      </div>
    </Card>
  );
}