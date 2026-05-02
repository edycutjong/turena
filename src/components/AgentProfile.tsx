"use client";
import { useAgentState } from "@/hooks/useAgentState";

type EmotionState = "CONFIDENT" | "CAUTIOUS" | "ANXIOUS" | "TILTED" | "MELTDOWN";

const EMOTION_METER: Record<EmotionState, { fill: number; color: string; label: string }> = {
  CONFIDENT: { fill: 0,   color: "bg-arena-cyan",  label: "CONFIDENT" },
  CAUTIOUS:  { fill: 25,  color: "bg-yellow-400",  label: "CAUTIOUS"  },
  ANXIOUS:   { fill: 50,  color: "bg-orange-400",  label: "ANXIOUS"   },
  TILTED:    { fill: 75,  color: "bg-red-400",     label: "TILTED"    },
  MELTDOWN:  { fill: 100, color: "bg-red-600",     label: "MELTDOWN"  },
};

interface Props {
  agentId: string;
  contractAddress?: string;
}

function StatRow({ label, value, color = "text-arena-text" }: {
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-arena-border/40 last:border-0">
      <span className="font-terminal text-xs text-arena-muted">{label}</span>
      <span className={`font-terminal text-sm font-bold tabular-nums ${color}`}>{value}</span>
    </div>
  );
}

export function AgentProfile({ agentId, contractAddress }: Props) {
  const state = useAgentState(agentId);

  const winRate  = state ? (state.win_rate * 100).toFixed(1) : "—";
  const pnl      = state ? state.total_pnl : null;
  const pnlColor = pnl == null ? "text-arena-muted"
    : pnl >= 0 ? "text-arena-green" : "text-arena-red";

  const emotion  = (state?.emotion_state as EmotionState | null) ?? "CONFIDENT";
  const meter    = EMOTION_METER[emotion];
  const isMeltdown = emotion === "MELTDOWN";

  return (
    <div className={`glass rounded-xl overflow-hidden transition-all duration-500
      ${isMeltdown ? "glow-red border border-red-500/40" : "glow-cyan"}
    `}>
      {/* NFT card header */}
      <div className={`relative px-4 py-4 border-b border-arena-border transition-colors duration-500
        ${isMeltdown ? "bg-gradient-to-br from-red-900/20 to-red-800/10" : "bg-gradient-to-br from-arena-purple/20 to-arena-cyan/10"}
      `}>
        <div className="flex items-center gap-3">
          {/* Agent avatar — pulses red during meltdown */}
          <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center bg-arena-bg transition-colors duration-500
            ${isMeltdown ? "border-red-500 animate-pulse" : "border-arena-purple"}
          `}>
            <span className={`font-terminal text-lg font-bold transition-colors ${isMeltdown ? "text-red-400" : "text-arena-purple"}`}>
              AI
            </span>
          </div>
          <div>
            <p className="font-terminal text-sm font-bold text-arena-text">TuringAgent #0</p>
            <p className="font-terminal text-xs text-arena-purple">ERC-8004 Identity</p>
          </div>
        </div>

        {/* ELO badge */}
        <div className="absolute top-4 right-4 text-right">
          <p className="font-terminal text-2xl font-bold text-arena-cyan tabular-nums">
            {state?.elo_rating ?? 1200}
          </p>
          <p className="font-terminal text-xs text-arena-muted">ELO</p>
        </div>
      </div>

      {/* Anxiety meter */}
      <div className="px-4 pt-3 pb-1">
        <div className="flex items-center justify-between mb-1">
          <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Anxiety</span>
          <span className={`font-terminal text-xs font-bold ${meter.color.replace("bg-", "text-")}`}>
            {meter.label}
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${meter.color} ${isMeltdown ? "animate-pulse" : ""}`}
            style={{ width: `${meter.fill}%` }}
          />
        </div>
        {state?.consecutive_losses != null && state.consecutive_losses > 0 && (
          <p className="font-terminal text-[10px] text-red-400/70 mt-0.5 text-right">
            {state.consecutive_losses} consecutive {state.consecutive_losses === 1 ? "loss" : "losses"}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="px-4 py-2">
        <StatRow label="Win Rate"        value={`${winRate}%`}
          color={parseFloat(winRate) >= 50 ? "text-arena-green" : "text-arena-red"} />
        <StatRow label="Total Trades"    value={state?.total_trades ?? 0} />
        <StatRow label="Total P&L"
          value={pnl != null ? `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} MNT` : "—"}
          color={pnlColor} />
        <StatRow label="Self-Corrections" value={state?.self_corrections_count ?? 0}
          color="text-arena-purple" />
      </div>

      {/* On-chain verification link */}
      {contractAddress && (
        <div className="px-4 py-2 border-t border-arena-border bg-black/20">
          <a
            href={`https://sepolia.mantlescan.xyz/address/${contractAddress}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-terminal text-xs text-arena-cyan hover:underline flex items-center gap-1"
          >
            <span>Verify on Mantle Explorer</span>
            <span>↗</span>
          </a>
        </div>
      )}
    </div>
  );
}
