"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type CotToken = Database["public"]["Tables"]["cot_tokens"]["Row"];

export function useCoTStream(cycleId: string | null) {
  const [tokens, setTokens] = useState<CotToken[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!cycleId) return;

    setTokens([]);

    const channel = supabase
      .channel(`cot-${cycleId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cot_tokens",
          filter: `cycle_id=eq.${cycleId}`,
        },
        (payload) => {
          setTokens((prev) => [...prev, payload.new as CotToken]);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [cycleId]);

  return tokens;
}
