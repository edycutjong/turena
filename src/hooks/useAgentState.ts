"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type AgentState = Database["public"]["Tables"]["agent_state"]["Row"];

export function useAgentState(agentId: string) {
  const [state, setState] = useState<AgentState | null>(null);

  useEffect(() => {
    supabase
      .from("agent_state")
      .select("*")
      .eq("agent_id", agentId)
      .single()
      .then(({ data }) => { if (data) setState(data); });

    const channel = supabase
      .channel(`agent-state-${agentId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "agent_state",
          filter: `agent_id=eq.${agentId}`,
        },
        (payload) => setState(payload.new as AgentState)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [agentId]);

  return state;
}
