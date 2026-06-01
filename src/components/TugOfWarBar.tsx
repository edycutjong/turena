"use client";
import { motion } from "framer-motion";
import { useCounterTrades } from "@/hooks/useCounterTrades";

interface Props {
  cycleId: string | null;
}

export function TugOfWarBar({ cycleId }: Props) {
  const { deepSeekPool, openAIPool } = useCounterTrades(cycleId);

  const total = deepSeekPool + openAIPool;
  
  // Calculate percentages (default to 50/50 if no bets)
  const deepSeekPct = total > 0 ? Math.round((deepSeekPool / total) * 100) : 50;
  const openAIPct = 100 - deepSeekPct;

  if (total === 0 && !cycleId) return null;

  return (
    <div className="px-4 py-3 glass rounded-xl border border-arena-border">
      <div className="flex items-center justify-between mb-2">
        <span className="font-terminal text-xs text-arena-cyan uppercase tracking-widest">
          DeepSeek {deepSeekPct}%
        </span>
        <span className="font-terminal text-[10px] text-arena-muted uppercase tracking-widest">
          Pool Balance
        </span>
        <span className="font-terminal text-xs text-arena-purple uppercase tracking-widest">
          OpenAI {openAIPct}%
        </span>
      </div>

      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex relative">
        {/* Left Side (DeepSeek) */}
        <motion.div 
          className="h-full bg-linear-to-r from-arena-cyan/80 to-arena-cyan"
          animate={{ width: `${deepSeekPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
        
        {/* Right Side (OpenAI) */}
        <motion.div 
          className="h-full bg-linear-to-r from-arena-purple to-arena-purple/80"
          animate={{ width: `${openAIPct}%` }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />

        {/* Tie indicator (only when tied exactly 50/50 and both have bets) */}
        {deepSeekPct === 50 && openAIPct === 50 && total > 0 && (
          <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 bg-linear-to-r from-arena-cyan to-arena-purple z-10 animate-pulse shadow-[0_0_10px_#fff]" />
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="font-terminal text-[10px] text-arena-cyan tabular-nums">
          {deepSeekPool.toFixed(2)} MNT
        </span>
        <span className="font-terminal text-[10px] text-arena-muted">
          Total: {total.toFixed(2)} MNT
        </span>
        <span className="font-terminal text-[10px] text-arena-purple tabular-nums">
          {openAIPool.toFixed(2)} MNT
        </span>
      </div>
    </div>
  );
}
