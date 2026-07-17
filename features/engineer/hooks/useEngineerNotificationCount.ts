"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export function useEngineerNotificationCount() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const client = createSupabaseBrowserClient() as any;
      const { count: next, error } = await client.from("operations_notifications").select("id", { count: "exact", head: true }).is("read_at", null);
      if (!cancelled && !error) setCount(next ?? 0);
    };
    void load();
    const interval = window.setInterval(load, 30_000);
    window.addEventListener("focus", load);
    return () => { cancelled = true; window.clearInterval(interval); window.removeEventListener("focus", load); };
  }, []);
  return count;
}
