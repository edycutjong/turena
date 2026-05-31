"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type TradeCycle = Database["public"]["Tables"]["trade_cycles"]["Row"];

export function useActiveCycle() {
  const [cycle, setCycle] = useState<TradeCycle | null>(null);

  useEffect(() => {
    // Load latest pending cycle on mount
    supabase
      .from("trade_cycles")
      .select("*")
      .eq("result", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => { if (data) setCycle(data); });

    // Subscribe to new cycles being inserted
    const channel = supabase
      .channel(`active-cycle-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "trade_cycles" },
        (payload) => setCycle(payload.new as TradeCycle)
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "trade_cycles" },
        (payload) => {
          const updated = payload.new as TradeCycle;
          setCycle((prev) => (prev?.id === updated.id ? updated : prev));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return cycle;
}
