"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { playWin, playLoss } from "@/lib/sounds";
import type { Database } from "@/lib/database.types";
import { MANTLE_EXPLORER } from "@/lib/escrow";

type TradeCycle = Database["public"]["Tables"]["trade_cycles"]["Row"];
type SelfCorrection = Database["public"]["Tables"]["self_corrections"]["Row"];

type HistoryRow =
  | { kind: "trade"; data: TradeCycle; key: string }
  | { kind: "correction"; data: SelfCorrection; key: string };

export function TradeHistory() {
  const [trades, setTrades] = useState<TradeCycle[]>([]);
  const [corrections, setCorrections] = useState<SelfCorrection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevTradeIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    Promise.all([
      supabase
        .from("trade_cycles")
        .select("*")
        .neq("result", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("self_corrections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20)
    ]).then(([tradesRes, corrRes]) => {
      if (tradesRes.data) {
        setTrades(tradesRes.data as TradeCycle[]);
        prevTradeIds.current = new Set((tradesRes.data as TradeCycle[]).map((t) => t.id));
      }
      if (corrRes.data) {
        setCorrections(corrRes.data as SelfCorrection[]);
      }
      setIsLoading(false);
    });

    const tradeCh = supabase
      .channel("trade-history")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "trade_cycles" },
        (payload) => {
          const updated = payload.new as TradeCycle;
          if (updated.result === "pending") return;
          if (!prevTradeIds.current.has(updated.id)) {
            if (updated.result === "win") playWin();
            else if (updated.result === "loss") playLoss();
            prevTradeIds.current.add(updated.id);
          }
          setTrades((prev) => {
            const exists = prev.find((t) => t.id === updated.id);
            if (exists) return prev.map((t) => (t.id === updated.id ? updated : t));
            return [updated, ...prev].slice(0, 20);
          });
        }
      )
      .subscribe();

    const corrCh = supabase
      .channel("trade-history-corrections")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "self_corrections" },
        (payload) => {
          setCorrections((prev) => [payload.new as SelfCorrection, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(tradeCh);
      supabase.removeChannel(corrCh);
    };
  }, []);

  // Merge and sort by created_at descending
  const rows: HistoryRow[] = [
    ...trades.map((t) => ({ kind: "trade" as const, data: t, key: `t-${t.id}` })),
    ...corrections.map((c) => ({ kind: "correction" as const, data: c, key: `c-${c.id}` })),
  ].sort((a, b) =>
    new Date(b.data.created_at).getTime() - new Date(a.data.created_at).getTime()
  ).slice(0, 20);

  return (
    <div className="glass rounded-xl overflow-hidden glow-cyan transition-all duration-300">
      <div className="px-4 py-2 border-b border-arena-border flex items-center justify-between">
        <span className="font-terminal text-xs text-arena-muted tracking-widest uppercase">
          Trade History
        </span>
        {isLoading && (
          <span className="font-terminal text-[10px] text-arena-cyan animate-pulse">
            LOADING...
          </span>
        )}
      </div>
      <div className="overflow-x-auto h-48 overflow-y-auto flex flex-col relative">
        {rows.length > 0 ? (
          <table className="w-full font-terminal text-xs">
            <thead className="sticky top-0 bg-arena-surface z-10">
              <tr className="text-arena-muted border-b border-arena-border">
                <th className="text-left px-4 py-2">Cycle</th>
                <th className="text-left px-4 py-2">Event</th>
                <th className="text-left px-4 py-2">Detail</th>
                <th className="text-right px-4 py-2">P&amp;L / Score</th>
                <th className="text-left px-4 py-2">Tx</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                if (row.kind === "trade") {
                  const t = row.data;
                  const intent = t.intent as { action?: string; asset?: string } | null;
                  return (
                    <tr
                      key={row.key}
                      className={`border-b border-arena-border/50 hover:bg-white/5 transition-colors ${
                        t.result === "win" ? "flash-win" : t.result === "loss" ? "flash-loss" : ""
                      }`}
                    >
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
                            href={`${MANTLE_EXPLORER}/tx/${t.tx_hash}`}
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
                }

                // Self-correction row
                const c = row.data;
                return (
                  <tr key={row.key} className="border-b border-arena-border/50 bg-arena-purple/5 hover:bg-arena-purple/10 transition-colors">
                    <td className="px-4 py-2 text-arena-muted">—</td>
                    <td className="px-4 py-2 text-arena-purple font-bold">⚡ CORRECTION</td>
                    <td className="px-4 py-2 text-arena-muted">
                      <span className="text-arena-text">{c.parameter_changed}</span>
                      {" "}
                      <span className="text-arena-red tabular-nums">{Number(c.old_value).toFixed(3)}</span>
                      {" → "}
                      <span className="text-arena-green tabular-nums">{Number(c.new_value).toFixed(3)}</span>
                    </td>
                    <td className="px-4 py-2 text-right text-arena-purple tabular-nums">
                      -{c.regret_score}
                    </td>
                    <td className="px-4 py-2">
                      {c.tx_hash ? (
                        <a
                          href={`${MANTLE_EXPLORER}/tx/${c.tx_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-arena-cyan hover:underline"
                        >
                          {c.tx_hash.slice(0, 8)}…
                        </a>
                      ) : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="flex-1 flex items-center justify-center text-arena-muted italic h-full">
            {isLoading ? (
              <span className="text-arena-cyan animate-pulse">Loading trades...</span>
            ) : (
              "No completed trades yet"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
