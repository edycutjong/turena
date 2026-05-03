"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type SabotageEvent = Database["public"]["Tables"]["sabotage_events"]["Row"];

interface SabotageTotals {
  events: SabotageEvent[];
  totalMnt: number;
  byCard: Record<string, { count: number; totalMnt: number }>;
}

export function useSabotageEvents(cycleId: string | null): SabotageTotals {
  const [events, setEvents] = useState<SabotageEvent[]>([]);
  useEffect(() => {
    if (!cycleId) {
      setEvents([]);
      return;
    }

    // Load existing events for this cycle
    supabase
      .from("sabotage_events")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("created_at", { ascending: true })
      .then(({ data }) => { if (data) setEvents(data); });

    // Unique name per effect run — Math.random avoids collisions across multiple hook instances
    const channelName = `sabotage-${cycleId}-${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sabotage_events",
          filter: `cycle_id=eq.${cycleId}`,
        },
        (payload) => setEvents((prev) => [...prev, payload.new as SabotageEvent])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cycleId]);

  const totalMnt = events.reduce((sum, e) => sum + Number(e.mnt_paid), 0);

  const byCard = events.reduce<Record<string, { count: number; totalMnt: number }>>(
    (acc, e) => {
      const k = e.card_type;
      if (!acc[k]) acc[k] = { count: 0, totalMnt: 0 };
      acc[k].count++;
      acc[k].totalMnt += Number(e.mnt_paid);
      return acc;
    },
    {}
  );

  return { events, totalMnt, byCard };
}
