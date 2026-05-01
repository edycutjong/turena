"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type SelfCorrection = Database["public"]["Tables"]["self_corrections"]["Row"];

export function useSelfCorrections() {
  const [corrections, setCorrections] = useState<SelfCorrection[]>([]);
  const [latest, setLatest] = useState<SelfCorrection | null>(null);

  useEffect(() => {
    supabase
      .from("self_corrections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => { if (data) setCorrections(data); });

    const channel = supabase
      .channel("self-corrections")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "self_corrections" },
        (payload) => {
          const c = payload.new as SelfCorrection;
          setCorrections((prev) => [c, ...prev]);
          setLatest(c);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return { corrections, latest };
}
