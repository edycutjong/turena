"use client";
import { motion } from "framer-motion";
import { useSabotageEvents } from "@/hooks/useSabotageEvents";
import { useCounterTrades } from "@/hooks/useCounterTrades";

interface Props {
  cycleId: string | null;
}

export function TugOfWarBar({ cycleId }: Props) {
  const { totalMnt: sabotageMnt } = useSabotageEvents(cycleId);
  const { totalPool: betMnt } = useCounterTrades(cycleId);

  const total = sabotageMnt + betMnt;
  // sabotage = humans sabotaging AI (orange side)
  // bets = humans betting against AI (red side)
  // Both are "against AI" — split into two colors on the human side
  const humanPct = total > 0 ? Math.min(100, Math.round(((sabotageMnt + betMnt) / (total + 1)) * 100)) : 50;
  const aiPct    = 100 - humanPct;

  if (total === 0 && !cycleId) return null;

  return (
    <div className="px-4 py-3 glass rounded-xl border border-arena-border">
      <div className="flex items-center justify-between mb-2">
        <span className="font-terminal text-xs text-arena-cyan uppercase tracking-widest">
          AI {aiPct}%
        </span>
        <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">
          Tug of War
        </span>
        <span className="font-terminal text-xs text-orange-400 uppercase tracking-widest">
          Humans {humanPct}%
        </span>
      </div>

      <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden flex">
        {/* AI side (cyan) */}
        <motion.div
          className="h-full bg-gradient-to-r from-arena-cyan to-cyan-500"
          animate={{ width: `${aiPct}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Sabotage (orange) */}
        <motion.div
          className="h-full bg-gradient-to-r from-orange-500 to-red-500"
          animate={{ width: `${total > 0 ? Math.round((sabotageMnt / (total + 1)) * 100) : 25}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
        {/* Counter-bets (red) */}
        <motion.div
          className="h-full bg-gradient-to-r from-red-600 to-red-800 flex-1"
        />
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="font-terminal text-[10px] text-arena-muted">
          AI bankroll
        </span>
        {total > 0 && (
          <span className="font-terminal text-[10px] text-orange-400 tabular-nums">
            {sabotageMnt.toFixed(1)} MNT sabotage · {betMnt.toFixed(2)} MNT bets
          </span>
        )}
        <span className="font-terminal text-[10px] text-arena-muted">
          {total.toFixed(2)} MNT vs AI
        </span>
      </div>
    </div>
  );
}
