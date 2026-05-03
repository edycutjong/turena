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

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTokens([]);

    // Subscribe for tokens inserted after we joined
    const seenIds = new Set<number>();

    // Fetch all tokens already in the DB for late-joining browsers
    supabase
      .from("cot_tokens")
      .select("*")
      .eq("cycle_id", cycleId)
      .order("id", { ascending: true })
      .then(({ data }) => {
        const rows = data as CotToken[] | null;
        if (rows && rows.length > 0) {
          rows.forEach((t) => seenIds.add(t.id));
          setTokens(rows);
        }
      });
    const channel = supabase
      .channel(`cot-${cycleId}-${Math.random().toString(36).slice(2, 8)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "cot_tokens",
          filter: `cycle_id=eq.${cycleId}`,
        },
        (payload) => {
          const token = payload.new as CotToken;
          // Guard against duplicates between the initial fetch and realtime stream
          if (seenIds.has(token.id)) return;
          seenIds.add(token.id);
          setTokens((prev) => [...prev, token]);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { supabase.removeChannel(channel); };
  }, [cycleId]);

  return tokens;
}
