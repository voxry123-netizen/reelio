"use client";

import { useEffect, useState } from "react";
import { Card } from "../ui/kit/Card";
import { Skeleton } from "../ui/kit/Skeleton";
import { api } from "../lib/api";

export default function RealmsPage() {
  const [data,setData] = useState<any>(null);
  const [loading,setLoading] = useState(true);

  useEffect(()=>{
    (async()=>{
      setLoading(true);
      try{
        // nu ai list explicit in swagger? => păstrăm autodetect simplu:
        const candidates = ["/realms", "/realms?limit=10", "/realms/discover"];
        for(const p of candidates){
          try{
            setData(await api(p));
            return;
          }catch{}
        }
        setData({ ok:false, note:"No realms list endpoint matched candidates", tried:candidates });
      } finally {
        setLoading(false);
      }
    })();
  },[]);

  return (
    <Card title="Realms">
      {loading ? <Skeleton h={180}/> : <pre className="rm-pre">{JSON.stringify(data,null,2)}</pre>}
    </Card>
  );
}