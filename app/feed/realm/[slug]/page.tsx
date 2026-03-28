"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "../../../ui/kit/Card";
import { Skeleton } from "../../../ui/kit/Skeleton";
import { api } from "../../../lib/api";

export default function RealmFeedPage() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [data,setData] = useState<any>(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    if(!slug) return;
    (async()=>{
      setLoading(true);
      try{
        setData(await api(`/feed/realm/${slug}`));
      }finally{
        setLoading(false);
      }
    })();
  },[slug]);

  return (
    <Card title="Privacy / Dashboard">
      {loading ? (
        <div className="h-[180px]">
          <Skeleton className="h-full w-full" />
        </div>
      ) : (
        <pre className="rm-pre">{JSON.stringify(data, null, 2)}</pre>
      )}
    </Card>
  );
}