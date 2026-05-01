"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import Link from "next/link";
import { CorrectionTimeline } from "@/components/CorrectionTimeline";

type CounterTrade = Database["public"]["Tables"]["counter_trades"]["Row"];
type AgentState = Database["public"]["Tables"]["agent_state"]["Row"];

interface TraderStat {
  wallet: string;
  trades: number;
  wins: number;
  totalWagered: number;
  totalPayout: number;
}

function shortAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export default function LeaderboardPage() {
  const [traders, setTraders] = useState<TraderStat[]>([]);
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [{ data: trades }, { data: agent }] = await Promise.all([
        supabase
          .from("counter_trades")
          .select("*")
          .neq("result", "pending"),
        supabase
          .from("agent_state")
          .select("*")
          .limit(1)
          .single(),
      ]);

      if (agent) setAgentState(agent);

      if (trades) {
        const map = new Map<string, TraderStat>();
        for (const t of trades as CounterTrade[]) {
          const existing = map.get(t.wallet_address) ?? {
            wallet: t.wallet_address,
            trades: 0,
            wins: 0,
            totalWagered: 0,
            totalPayout: 0,
          };
          existing.trades += 1;
          if (t.result === "win") existing.wins += 1;
          existing.totalWagered += t.amount_mnt;
          existing.totalPayout += t.payout_mnt ?? 0;
          map.set(t.wallet_address, existing);
        }
        const sorted = Array.from(map.values()).sort(
          (a, b) => (b.totalPayout - b.totalWagered) - (a.totalPayout - a.totalWagered)
        );
        setTraders(sorted);
      }
      setLoading(false);
    }
    load();
  }, []);

  const agentWins = agentState?.total_trades
    ? Math.round((agentState.win_rate ?? 0) * agentState.total_trades)
    : 0;
  const humanWins = (agentState?.total_trades ?? 0) - agentWins;

  return (
    <div className="min-h-screen bg-arena-bg p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Link href="/" className="font-terminal text-xs text-arena-muted hover:text-arena-cyan">← Back</Link>
          <h1 className="font-terminal text-2xl font-bold text-arena-text">Leaderboard</h1>
        </div>

        {/* AI vs Humans scoreboard */}
        <div className="glass rounded-xl p-6 grid grid-cols-2 gap-6">
          <div className="flex flex-col items-center gap-2">
            <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">AI Agent</span>
            <span className="font-terminal text-5xl font-bold text-arena-cyan">{agentWins}</span>
            <span className="font-terminal text-xs text-arena-muted">
              wins · {agentState ? `${(agentState.win_rate * 100).toFixed(1)}%` : "—"}
            </span>
            <span className="font-terminal text-xs text-arena-purple">
              ELO {agentState?.elo_rating ?? "—"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Humans</span>
            <span className="font-terminal text-5xl font-bold text-arena-red">{humanWins}</span>
            <span className="font-terminal text-xs text-arena-muted">
              wins ·{" "}
              {agentState?.total_trades
                ? `${((humanWins / agentState.total_trades) * 100).toFixed(1)}%`
                : "—"}
            </span>
            <span className="font-terminal text-xs text-arena-muted">
              {traders.length} unique traders
            </span>
          </div>
        </div>

        {/* Top counter-traders */}
        <div className="glass rounded-xl overflow-hidden">
          <div className="px-4 py-2 border-b border-arena-border">
            <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">
              Top Counter-Traders
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full font-terminal text-xs">
              <thead>
                <tr className="text-arena-muted border-b border-arena-border">
                  <th className="text-left px-4 py-2">Rank</th>
                  <th className="text-left px-4 py-2">Wallet</th>
                  <th className="text-right px-4 py-2">Trades</th>
                  <th className="text-right px-4 py-2">Win %</th>
                  <th className="text-right px-4 py-2">Net P&amp;L (MNT)</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-arena-muted italic">
                      Loading…
                    </td>
                  </tr>
                )}
                {!loading && traders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-arena-muted italic">
                      No counter-trades yet — be the first!
                    </td>
                  </tr>
                )}
                {traders.map((t, i) => {
                  const net = t.totalPayout - t.totalWagered;
                  const winPct = t.trades > 0 ? ((t.wins / t.trades) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={t.wallet} className="border-b border-arena-border/50 hover:bg-white/5 transition-colors">
                      <td className="px-4 py-2 text-arena-muted">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-2 text-arena-cyan">
                        <a
                          href={`https://explorer.sepolia.mantle.xyz/address/${t.wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {shortAddr(t.wallet)}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-right tabular-nums text-arena-text">{t.trades}</td>
                      <td className="px-4 py-2 text-right tabular-nums text-arena-text">{winPct}%</td>
                      <td className={`px-4 py-2 text-right tabular-nums font-bold ${net >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                        {net >= 0 ? "+" : ""}{net.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Self-correction count */}
        {agentState && (
          <div className="glass rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Agent Self-Corrections</p>
              <p className="font-terminal text-2xl font-bold text-arena-purple mt-1">
                {agentState.self_corrections_count}
              </p>
            </div>
            <div className="text-right">
              <p className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Total Agent P&amp;L</p>
              <p className={`font-terminal text-2xl font-bold mt-1 ${agentState.total_pnl >= 0 ? "text-arena-green" : "text-arena-red"}`}>
                {agentState.total_pnl >= 0 ? "+" : ""}{agentState.total_pnl.toFixed(2)} MNT
              </p>
            </div>
          </div>
        )}

        {/* Correction timeline */}
        <CorrectionTimeline />
      </div>
    </div>
  );
}
