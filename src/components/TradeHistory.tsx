"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type TradeCycle = Database["public"]["Tables"]["trade_cycles"]["Row"];

export function TradeHistory() {
  const [trades, setTrades] = useState<TradeCycle[]>([]);

  useEffect(() => {
    supabase
      .from("trade_cycles")
      .select("*")
      .neq("result", "pending")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setTrades(data); });

    const channel = supabase
      .channel("trade-history")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trade_cycles" },
        (payload) => {
          const updated = payload.new as TradeCycle;
          if (updated.result === "pending") return;
          setTrades((prev) => {
            const exists = prev.find((t) => t.id === updated.id);
            if (exists) return prev.map((t) => (t.id === updated.id ? updated : t));
            return [updated, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <div className="bg-arena-surface border border-arena-border rounded-lg overflow-hidden">
      <div className="px-4 py-2 border-b border-arena-border">
        <span className="font-terminal text-xs text-arena-muted tracking-widest uppercase">
          Trade History
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full font-terminal text-xs">
          <thead>
            <tr className="text-arena-muted border-b border-arena-border">
              <th className="text-left px-4 py-2">Cycle</th>
              <th className="text-left px-4 py-2">Action</th>
              <th className="text-left px-4 py-2">Result</th>
              <th className="text-right px-4 py-2">P&amp;L (MNT)</th>
              <th className="text-left px-4 py-2">Tx</th>
            </tr>
          </thead>
          <tbody>
            {trades.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-4 text-arena-muted text-center italic">
                  No completed trades yet
                </td>
              </tr>
            )}
            {trades.map((t) => {
              const intent = t.intent as { action?: string; asset?: string } | null;
              return (
                <tr key={t.id} className={`border-b border-arena-border/50 hover:bg-white/5 transition-colors ${t.result === "win" ? "flash-win" : ""}`}>
                  <td className="px-4 py-2 text-arena-muted">#{t.cycle_number}</td>
                  <td className="px-4 py-2 uppercase">
                    {intent?.action ?? "—"}{" "}
                    <span className="text-arena-muted">{intent?.asset ?? ""}</span>
                  </td>
                  <td className={`px-4 py-2 font-bold ${
                    t.result === "win" ? "text-arena-green" : "text-arena-red"
                  }`}>
                    {t.result.toUpperCase()}
                    {t.self_corrected && (
                      <span className="ml-1 text-arena-purple text-xs">⚡</span>
                    )}
                  </td>
                  <td className={`px-4 py-2 text-right tabular-nums ${
                    (t.pnl_mnt ?? 0) >= 0 ? "text-arena-green" : "text-arena-red"
                  }`}>
                    {t.pnl_mnt != null
                      ? `${t.pnl_mnt >= 0 ? "+" : ""}${t.pnl_mnt.toFixed(2)}`
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    {t.tx_hash ? (
                      <a
                        href={`https://explorer.sepolia.mantle.xyz/tx/${t.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-arena-cyan hover:underline"
                      >
                        {t.tx_hash.slice(0, 8)}…
                      </a>
                    ) : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
