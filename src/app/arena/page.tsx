"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback } from "react";
import { CoTTerminal } from "@/components/CoTTerminal";
import { CountdownTimer } from "@/components/CountdownTimer";
import { CounterTradeButton } from "@/components/CounterTradeButton";
import { IntentAnnouncement } from "@/components/IntentAnnouncement";
import { MarketChart } from "@/components/MarketChart";
import { TradeHistory } from "@/components/TradeHistory";
import { AgentProfile } from "@/components/AgentProfile";
import { SelfCorrectionOverlay } from "@/components/SelfCorrectionOverlay";
import { LiveChat } from "@/components/LiveChat";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { useCounterTrades } from "@/hooks/useCounterTrades";
import Link from "next/link";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TURING_AGENT_ADDRESS;

const AGENT_ID = process.env.NEXT_PUBLIC_TURING_AGENT_ADDRESS ?? "agent-0";
const WINDOW_SECONDS = 15;

export default function ArenaPage() {
  const cycle = useActiveCycle();
  const { totalPool, againstPool } = useCounterTrades(cycle?.id ?? null);

  const [windowStartedAt, setWindowStartedAt] = useState<Date | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);

  // Timer starts when cycle moves to pending (backend fires it)
  // For now wired manually — will be triggered by backend intent token
  const openWindow = useCallback(() => {
    setWindowStartedAt(new Date());
    setWindowOpen(true);
  }, []);

  const handleExpire = useCallback(() => {
    setWindowOpen(false);
  }, []);

  const handleBet = useCallback(() => {
    // Full implementation in Task 6 / wallet integration
    alert("Counter-trade placement — wallet integration coming in Task 11");
  }, []);

  // Parse intent from latest intent token (set by CoT stream)
  const intent = cycle?.intent as {
    action: "long" | "short";
    asset: string;
    confidence: number;
  } | null;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-arena-bg">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-arena-border bg-arena-surface/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <span className="font-terminal text-arena-cyan font-bold text-lg tracking-tight">
            TuringArena
          </span>
          <span className="font-terminal text-xs text-arena-muted">
            {cycle ? `Cycle #${cycle.cycle_number}` : "Idle"}
          </span>
        </div>

        <div className="flex items-center gap-4 font-terminal text-xs text-arena-muted">
          <span className={`flex items-center gap-1.5 ${cycle ? "text-arena-green" : "text-arena-muted"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cycle ? "bg-arena-green animate-pulse" : "bg-arena-muted"}`} />
            {cycle ? "Live" : "Standby"}
          </span>
          <span className="text-arena-muted/40">|</span>
          <span>Mantle Testnet</span>
          <span className="text-arena-muted/40">|</span>
          <Link href="/leaderboard" className="hover:text-arena-cyan transition-colors">Leaderboard</Link>
          <Link href="/replay" className="hover:text-arena-cyan transition-colors">Replay</Link>
        </div>
      </header>

      {/* Main split layout */}
      <div className="flex flex-1 overflow-hidden gap-2 p-2">
        {/* Left — Agent profile + Market chart */}
        <div className="flex flex-col w-[38%] gap-2">
          <AgentProfile agentId={AGENT_ID} contractAddress={CONTRACT_ADDRESS} />
          <div className="flex-1">
            <MarketChart />
          </div>
          {/* Manual trigger for demo — will be removed in production */}
          <button
            onClick={openWindow}
            className="font-terminal text-xs text-arena-muted border border-arena-border rounded px-3 py-1.5 hover:border-arena-cyan hover:text-arena-cyan transition-colors"
          >
            [dev] open counter window
          </button>
        </div>

        {/* Center — Timer + Intent + Bet button */}
        <div className="flex flex-col items-center justify-center gap-5 w-[24%]">
          <CountdownTimer
            durationSeconds={WINDOW_SECONDS}
            startedAt={windowStartedAt}
            onExpire={handleExpire}
          />
          <IntentAnnouncement intent={intent} visible={windowOpen} />
          <CounterTradeButton
            isOpen={windowOpen}
            totalPool={totalPool}
            againstPool={againstPool}
            onBet={handleBet}
          />
        </div>

        {/* Right — CoT Terminal + Live Chat */}
        <div className="flex flex-col flex-1 gap-2" style={{ minWidth: 0 }}>
          <div className="flex-1 min-h-0">
            <CoTTerminal cycleId={cycle?.id ?? null} />
          </div>
          <div className="h-48">
            <LiveChat />
          </div>
        </div>
      </div>

      {/* Bottom — Trade history */}
      <div className="px-2 pb-2">
        <TradeHistory />
      </div>

      {/* Global self-correction overlay — fixed position, fires on any correction */}
      <SelfCorrectionOverlay />
    </div>
  );
}
