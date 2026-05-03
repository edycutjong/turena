"use client";
export const dynamic = "force-dynamic";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import Link from "next/link";
import { motion, animate } from "framer-motion";
import { CorrectionTimeline } from "@/components/CorrectionTimeline";
import { AppNav } from "@/components/AppNav";
import { MANTLE_EXPLORER } from "@/lib/escrow";

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

function AnimatedNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.8,
      ease: "easeOut",
      onUpdate(v) {
        setDisplayValue(Math.floor(v));
      }
    });
    return controls.stop;
  }, [value]);

  return <>{displayValue}</>;
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
    <div className="min-h-screen bg-arena-bg flex flex-col relative overflow-hidden">
      {/* Premium Background FX Layers */}
      <div className="bg-aurora z-0" />
      <div className="bg-shimmer-dots z-1" />

      <div className="relative z-10 flex flex-col flex-1">
        <AppNav right={
          <Link href="/" className="hover:text-arena-cyan transition-colors font-terminal text-sm glow-hover">← Home</Link>
        } />
        <div className="max-w-4xl mx-auto w-full space-y-6 p-6 animate-fade-in-up">
          <h1 className="font-terminal text-2xl font-bold text-arena-text glow-text">Leaderboard</h1>

        {/* AI vs Humans scoreboard */}
        <div className="glass rounded-xl p-6 grid grid-cols-2 gap-6 arena-panel arena-panel-d1 hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] transition-shadow duration-300">
          <div className="flex flex-col items-center gap-2">
            <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">AI Agent</span>
            <span className="font-terminal text-5xl font-bold text-arena-cyan glow-text">
              <AnimatedNumber value={agentWins} />
            </span>
            <span className="font-terminal text-xs text-arena-muted">
              wins · {agentState ? `${(agentState.win_rate * 100).toFixed(1)}%` : "—"}
            </span>
            <span className="font-terminal text-xs text-arena-purple">
              ELO {agentState?.elo_rating ?? "—"}
            </span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Humans</span>
            <span className="font-terminal text-5xl font-bold text-arena-red glow-text">
              <AnimatedNumber value={humanWins} />
            </span>
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
        <div className="glass rounded-xl overflow-hidden arena-panel arena-panel-d2">
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
                    <motion.tr 
                      key={t.wallet} 
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                      className="border-b border-arena-border/50 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-4 py-2 text-arena-muted">
                        {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                      </td>
                      <td className="px-4 py-2 text-arena-cyan">
                        <a
                          href={`${MANTLE_EXPLORER}/address/${t.wallet}`}
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
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Self-correction count */}
        {agentState && (
          <div className="glass rounded-xl p-4 flex items-center justify-between arena-panel arena-panel-d3 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-shadow duration-300">
            <div>
              <p className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Agent Self-Corrections</p>
              <p className="font-terminal text-2xl font-bold text-arena-purple mt-1 glow-text">
                <AnimatedNumber value={agentState.self_corrections_count} />
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
        <div className="arena-panel arena-panel-d4">
          <CorrectionTimeline />
        </div>
      </div>
      </div>
    </div>
  );
}
