"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "../../ui/kit/Card";
import { Button } from "../../ui/kit/Button";
import { api, apiPost } from "../../lib/api";
import { useToast } from "../../providers/ToastProvider";
import { useModal } from "../../providers/ModalProvider";

export default function RealmPage() {
  const { push } = useToast();
  const { confirm } = useModal();
  const params = useParams<{ slug: string }>();
  const slug = params?.slug;

  const [data,setData] = useState<any>(null);

  useEffect(()=>{
    if(!slug) return;
    (async()=>{
      try{ setData(await api(`/realms/${slug}`)); }
      catch(e:any){ push({kind:"error", title:"Realm load failed", message:e.message}); }
    })();
  },[slug]);

  return (
    <Card title={`Realm: ${slug}`}>
  <div className="rm-row" style={{ justifyContent: "flex-end", marginBottom: 12 }}>
    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await apiPost(`/realms/${slug}/join`, {});
          push("success", "Joined");
        } catch (e: any) {
          push("error", "Join failed", e?.message ?? String(e));
        }
      }}
    >
      Join
    </Button>

    <Button
      variant="ghost"
      size="sm"
      onClick={async () => {
        try {
          await apiPost(`/realms/${slug}/leave`, {});
          push("success", "Left");
        } catch (e: any) {
          push("error", "Leave failed", e?.message ?? String(e));
        }
      }}
    >
      Leave
    </Button>
  </div>

  {/* restul conținutului tău aici */}
</Card>
  );
}