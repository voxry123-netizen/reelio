"use client";

import { useEffect, useState } from "react";
import { Card } from "../../ui/kit/Card";
import { Skeleton } from "../../ui/kit/Skeleton";
import { api } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";

export default function FollowingPage() {
  const { push } = useToast();
  const [data,setData] = useState<any>(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        setData(await api("/feed/following"));
      }catch(e:any){
        push({ kind:"error", title:"Following feed error", message: e.message });
      }finally{ setLoading(false); }
    })();
  },[]);

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