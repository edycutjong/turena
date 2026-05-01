"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import Link from "next/link";

type TradeCycle = Database["public"]["Tables"]["trade_cycles"]["Row"];
type CotToken = Database["public"]["Tables"]["cot_tokens"]["Row"];

export default function ReplayPage() {
  const [cycles, setCycles] = useState<TradeCycle[]>([]);
  const [selected, setSelected] = useState<TradeCycle | null>(null);
  const [tokens, setTokens] = useState<CotToken[]>([]);

  useEffect(() => {
    supabase
      .from("trade_cycles")
      .select("*")
      .neq("result", "pending")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => { if (data) setCycles(data); });
  }, []);

  const loadReplay = async (cycle: TradeCycle) => {
    setSelected(cycle);
    setTokens([]);
    const { data } = await supabase
      .from("cot_tokens")
      .select("*")
      .eq("cycle_id", cycle.id)
      .order("id", { ascending: true });
    if (data) setTokens(data);
  };

  return (
    <div className="min-h-screen bg-arena-bg p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="font-terminal text-xs text-arena-muted hover:text-arena-cyan">← Back</Link>
          <h1 className="font-terminal text-2xl font-bold text-arena-text">Trade Replay</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cycle list */}
          <div className="glass rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-arena-border">
              <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Cycles</span>
            </div>
            <div className="overflow-y-auto max-h-[70vh]">
              {cycles.map((c) => {
                const intent = c.intent as { action?: string; asset?: string } | null;
                return (
                  <button
                    key={c.id}
                    onClick={() => loadReplay(c)}
                    className={`w-full text-left px-4 py-3 border-b border-arena-border/40 hover:bg-white/5 transition-colors
                      ${selected?.id === c.id ? "bg-arena-cyan/10" : ""}`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-terminal text-xs text-arena-muted">#{c.cycle_number}</span>
                      <span className={`font-terminal text-xs font-bold
                        ${c.result === "win" ? "text-arena-green" : "text-arena-red"}`}>
                        {c.result.toUpperCase()}
                        {c.self_corrected && " ⚡"}
                      </span>
                    </div>
                    <p className="font-terminal text-xs text-arena-text mt-0.5 truncate">
                      {intent?.action?.toUpperCase()} {intent?.asset}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* CoT replay */}
          <div className="md:col-span-2 glass rounded-xl overflow-hidden scanlines relative flex flex-col">
            <div className="px-4 py-2 border-b border-arena-border">
              <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">
                {selected ? `Cycle #${selected.cycle_number} — ${selected.result.toUpperCase()}` : "Select a cycle"}
              </span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 font-terminal text-sm leading-relaxed max-h-[70vh]">
              {tokens.length === 0 && (
                <p className="text-arena-muted italic">
                  {selected ? "Loading CoT transcript…" : "Click a cycle to replay its reasoning"}
                </p>
              )}
              {tokens.map((t) => (
                <span key={t.id} className={
                  t.token_type === "reasoning" ? "text-arena-cyan"
                  : t.token_type === "intent" ? "text-yellow-400"
                  : "text-arena-red"
                }>
                  {t.token_text}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
