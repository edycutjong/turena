"use client";
export const dynamic = "force-dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import { CoTTerminal, type EmotionState } from "@/components/CoTTerminal";
import { CountdownTimer } from "@/components/CountdownTimer";
import { CounterTradeButton } from "@/components/CounterTradeButton";
import { IntentAnnouncement } from "@/components/IntentAnnouncement";
import { MarketChart } from "@/components/MarketChart";
import { TradeHistory } from "@/components/TradeHistory";
import { AgentProfile } from "@/components/AgentProfile";
import { SelfCorrectionOverlay } from "@/components/SelfCorrectionOverlay";
import { SpectatorChat } from "@/components/SpectatorChat";
import { FudCardPanel } from "@/components/FudCardPanel";
import { TugOfWarBar } from "@/components/TugOfWarBar";
import { SabotageFeed } from "@/components/SabotageFeed";
import { ConfettiBurst } from "@/components/ConfettiBurst";
import { useActiveCycle } from "@/hooks/useActiveCycle";
import { useCounterTrades } from "@/hooks/useCounterTrades";
import { useAgentState } from "@/hooks/useAgentState";
import { useWallet } from "@/hooks/useWallet";
import Link from "next/link";
import { playWindowOpen, setMuted, startAmbient, stopAmbient, playWin, playLoss } from "@/lib/sounds";
import { AppNav } from "@/components/AppNav";

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_TURING_AGENT_ADDRESS;
const AGENT_ID = "agent-0";
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL!;
const WINDOW_SECONDS = 20;

export default function ArenaPage() {
  const cycle = useActiveCycle();
  const agentState = useAgentState(AGENT_ID);
  const { deepSeekPool, openAIPool } = useCounterTrades(cycle?.id ?? null);
  const { address: walletAddress, connected, connect } = useWallet();

  const [windowStartedAt, setWindowStartedAt] = useState<Date | null>(null);
  const [windowOpen, setWindowOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  // cotEmotion: set only when CoT stream emits [EMOTION:...] for the current cycle
  const [cotEmotion, setCotEmotion] = useState<EmotionState | null>(null);
  const [muted, setMutedState] = useState(true);
  const [burstType, setBurstType] = useState<"win" | "loss" | null>(null);

  // Reset CoT emotion on each new cycle so stale MELTDOWN doesn't linger
  const prevCycleForEmotionRef = useRef<string | null>(null);
  useEffect(() => {
    prevCycleForEmotionRef.current = cycle?.id ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCotEmotion(null);
  }, [cycle?.id]);

  // displayEmotion: CoT stream wins if available; fall back to last settled emotion from DB
  const displayEmotion: EmotionState =
    cotEmotion ??
    (agentState?.emotion_state as EmotionState | null) ??
    "CONFIDENT";

  const prevPhaseRef = useRef<string | null>(null);
  const prevCycleIdRef = useRef<string | null>(null);

  // Sync window open/start time from DB — works for any browser that loads mid-window
  useEffect(() => {
    const phase = cycle?.phase ?? null;
    if (phase === "SABOTAGE_WINDOW" && cycle?.sabotage_started_at) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setWindowStartedAt(new Date(cycle.sabotage_started_at));
      setWindowOpen(true);
      playWindowOpen();
    } else if (phase !== "SABOTAGE_WINDOW") {
      setWindowOpen(false);
    }
  }, [cycle?.phase, cycle?.sabotage_started_at]);

  // Ambient sound: play during READING phase
  useEffect(() => {
    const phase = cycle?.phase ?? null;
    if (phase === "READING") {
      startAmbient();
    } else {
      stopAmbient();
    }
  }, [cycle?.phase]);

  // Settlement burst: trigger when cycle transitions to SETTLED
  useEffect(() => {
    const phase    = cycle?.phase ?? null;
    const cycleId  = cycle?.id    ?? null;
    const prevPhase   = prevPhaseRef.current;
    const prevCycleId = prevCycleIdRef.current;

    if (phase === "SETTLED" && prevPhase !== "SETTLED" && cycleId === prevCycleId) {
      if (cycle?.result === "win") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setBurstType("win");
        playWin();
      } else if (cycle?.result === "loss") {
        setBurstType("loss");
        playLoss();
      }
    }

    prevPhaseRef.current   = phase;
    prevCycleIdRef.current = cycleId;
  }, [cycle]);

  const toggleMute = useCallback(() => {
    setMutedState((prev) => {
      setMuted(!prev);
      return !prev;
    });
  }, []);

  const triggerCycle = useCallback(async () => {
    setTriggering(true);
    try {
      await fetch(`${BACKEND_URL}/agent/run-cycle`, { method: "POST" });
    } finally {
      setTriggering(false);
    }
  }, []);

  const openWindow = useCallback(() => {
    setWindowStartedAt(new Date());
    setWindowOpen(true);
    playWindowOpen();
  }, []);

  const handleExpire = useCallback(() => {
    setWindowOpen(false);
  }, []);

  const handleBetSuccess = useCallback((txHash: string) => {
    console.info("Bet placed:", txHash);
  }, []);

  const intent = cycle?.intent as {
    action: "long" | "short";
    asset: string;
    confidence: number;
  } | null;

  const isMeltdown = displayEmotion === "MELTDOWN";
  const isTilted   = displayEmotion === "TILTED";

  return (
    <div className={`flex flex-col min-h-screen md:h-screen md:overflow-hidden overflow-x-hidden transition-colors duration-500
      ${isMeltdown ? "bg-red-950/30" : "bg-arena-bg"}
      ${isTilted   ? "bg-orange-950/20" : ""}
    `}>
      <AppNav
        sub={cycle ? `· Cycle #${cycle.cycle_number}` : "· Idle"}
        right={
          <>
            <span className={`flex items-center gap-1.5 ${cycle ? "text-arena-green" : "text-arena-muted"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${cycle ? "bg-arena-green animate-pulse" : "bg-arena-muted"}`} />
              {cycle ? "Live" : "Standby"}
            </span>
            <span className="text-arena-muted/40">|</span>
            <span>Mantle Testnet</span>
            <span className="text-arena-muted/40">|</span>
            <Link href="/leaderboard" className="hover:text-arena-cyan transition-colors">Leaderboard</Link>
            <span className="text-arena-muted/40">|</span>
            <button
              onClick={toggleMute}
              className="font-terminal text-xs text-arena-muted hover:text-arena-text transition-colors"
              title={muted ? "Unmute sounds" : "Mute sounds"}
            >
              {muted ? "🔇" : "🔊"}
            </button>
            <span className="text-arena-muted/40">|</span>
            {connected && walletAddress ? (
              <span className="text-arena-green">
                {walletAddress.slice(0, 6)}…{walletAddress.slice(-4)}
              </span>
            ) : (
              <button onClick={connect} className="text-arena-cyan hover:underline">
                Connect Wallet
              </button>
            )}
          </>
        }
      />

      {/* Main split layout */}
      <div className="flex flex-col md:flex-row md:flex-1 md:overflow-hidden gap-2 p-2">
        {/* Left — Agent profile + Market chart */}
        <div className="flex flex-col md:w-[38%] gap-2 arena-panel arena-panel-d1">
          <AgentProfile agentId={AGENT_ID} contractAddress={CONTRACT_ADDRESS} />
          <div className="flex-1 min-h-48">
            <MarketChart />
          </div>
          <div className="flex gap-2">
            <button
              onClick={triggerCycle}
              disabled={triggering}
              className="flex-1 font-terminal text-xs text-arena-green border border-arena-green/40 rounded px-3 py-1.5 hover:bg-arena-green/10 transition-colors disabled:opacity-40"
            >
              {triggering ? "[dev] starting…" : "[dev] trigger cycle"}
            </button>
            <button
              onClick={openWindow}
              className="flex-1 font-terminal text-xs text-arena-cyan border border-arena-cyan/40 rounded px-3 py-1.5 hover:bg-arena-cyan/10 transition-colors"
            >
              [dev] open window
            </button>
          </div>
        </div>

        {/* Center — Timer + Intent + Bet button */}
        <div className="flex flex-col items-center justify-center gap-5 py-6 md:py-0 md:w-[24%] arena-panel arena-panel-d3">
          <CountdownTimer
            durationSeconds={WINDOW_SECONDS}
            startedAt={windowStartedAt}
            onExpire={handleExpire}
            phase={cycle?.phase ?? null}
          />
          <IntentAnnouncement intent={intent} visible={windowOpen} />
          <CounterTradeButton
            isOpen={windowOpen}
            deepSeekPool={deepSeekPool}
            openAIPool={openAIPool}
            cycleNumber={cycle?.cycle_number ?? null}
            walletAddress={walletAddress ?? null}
            onConnect={connect}
            onBetSuccess={handleBetSuccess}
          />
        </div>

        {/* Right — CoT Terminal + Live Chat */}
        <div className="flex flex-col flex-1 gap-2 min-h-[400px] md:min-h-0 arena-panel arena-panel-d2" style={{ minWidth: 0 }}>
          <div className="flex flex-1 gap-2 min-h-0">
             {/* Split Screen AI 1 */}
             <div className="flex-1 min-w-0">
                <CoTTerminal cycleId={cycle?.id ?? null} onEmotionChange={setCotEmotion} agentId="agent-0" />
             </div>
             {/* Split Screen AI 2 */}
             <div className="flex-1 min-w-0 hidden lg:block">
                <CoTTerminal cycleId={cycle?.id ?? null} agentId="agent-1" />
             </div>
          </div>
          <div className="h-48 shrink-0 border border-zinc-800 rounded overflow-hidden">
            <SpectatorChat />
          </div>
        </div>
      </div>

      {/* FUD Cards — visible during SABOTAGE_WINDOW */}
      {cycle?.phase === "SABOTAGE_WINDOW" && (
        <div className="px-2 pb-0">
          <FudCardPanel cycleId={cycle.id} isOpen={cycle.phase === "SABOTAGE_WINDOW"} />
        </div>
      )}

      {/* Live sabotage feed ticker */}
      {(cycle?.phase === "SABOTAGE_WINDOW" || cycle?.phase === "VERDICT") && (
        <SabotageFeed cycleId={cycle.id} />
      )}

      {/* Tug of War bar — visible during SABOTAGE_WINDOW and VERDICT */}
      {(cycle?.phase === "SABOTAGE_WINDOW" || cycle?.phase === "VERDICT") && (
        <div className="px-2 pb-0">
          <TugOfWarBar cycleId={cycle.id} />
        </div>
      )}

      {/* Bottom — Trade history */}
      <div className="px-2 pb-2 md:shrink-0 arena-panel arena-panel-d5">
        <TradeHistory />
      </div>

      {/* Global self-correction overlay */}
      <SelfCorrectionOverlay />

      {/* Settlement particle burst */}
      <ConfettiBurst type={burstType} onDone={() => setBurstType(null)} />
    </div>
  );
}
