"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type CounterTrade = Database["public"]["Tables"]["counter_trades"]["Row"];

export function useCounterTrades(cycleId: string | null) {
  const [trades, setTrades] = useState<CounterTrade[]>([]);
  useEffect(() => {
    if (!cycleId) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrades([]);

    supabase
      .from("counter_trades")
      .select("*")
      .eq("cycle_id", cycleId)
      .then(({ data }) => { if (data) setTrades(data); });

    // Unique name per effect run — Math.random avoids collisions across multiple hook instances
    const channelName = `counter-trades-${cycleId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "counter_trades",
          filter: `cycle_id=eq.${cycleId}`,
        },
        (payload) => setTrades((prev) => [...prev, payload.new as CounterTrade])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cycleId]);

  const deepSeekPool = trades.filter((t) => t.position === "for").reduce((sum, t) => sum + t.amount_mnt, 0);
  const openAIPool = trades.filter((t) => t.position === "against").reduce((sum, t) => sum + t.amount_mnt, 0);

  return { trades, deepSeekPool, openAIPool };
}
