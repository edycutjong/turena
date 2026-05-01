"use client";
import { useAgentState } from "@/hooks/useAgentState";

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

  const winRate = state ? (state.win_rate * 100).toFixed(1) : "—";
  const pnl     = state ? state.total_pnl : null;
  const pnlColor = pnl == null ? "text-arena-muted"
    : pnl >= 0 ? "text-arena-green" : "text-arena-red";

  return (
    <div className="glass rounded-xl overflow-hidden glow-cyan transition-all duration-300">
      {/* NFT card header */}
      <div className="relative px-4 py-4 bg-gradient-to-br from-arena-purple/20 to-arena-cyan/10 border-b border-arena-border">
        <div className="flex items-center gap-3">
          {/* Agent avatar */}
          <div className="w-12 h-12 rounded-full border-2 border-arena-purple flex items-center justify-center bg-arena-bg">
            <span className="font-terminal text-arena-purple text-lg font-bold">AI</span>
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

      {/* Stats */}
      <div className="px-4 py-3">
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
            href={`https://explorer.sepolia.mantle.xyz/address/${contractAddress}`}
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
