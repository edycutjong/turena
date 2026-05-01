"use client";
import { motion } from "framer-motion";

interface Props {
  isOpen: boolean;
  totalPool: number;
  againstPool: number;
  onBet: () => void;
}

export function CounterTradeButton({ isOpen, totalPool, againstPool, onBet }: Props) {
  return (
    <div className="flex flex-col items-center gap-3">
      <motion.button
        onClick={onBet}
        disabled={!isOpen}
        whileHover={isOpen ? { scale: 1.04 } : {}}
        whileTap={isOpen  ? { scale: 0.97 } : {}}
        animate={isOpen
          ? { boxShadow: ["0 0 0px #ef4444", "0 0 22px #ef4444", "0 0 0px #ef4444"] }
          : { boxShadow: "none" }
        }
        transition={{ repeat: Infinity, duration: 1.4 }}
        className={`relative px-10 py-4 rounded-xl font-terminal font-bold text-lg
          tracking-widest uppercase transition-colors
          ${isOpen
            ? "bg-arena-red text-white cursor-pointer hover:bg-red-600"
            : "bg-arena-surface text-arena-muted border border-arena-border cursor-not-allowed"
          }`}
      >
        {isOpen ? "⚡ Counter Trade" : "Waiting…"}
      </motion.button>

      {/* Live pool display */}
      <div className="flex gap-6 font-terminal text-xs text-arena-muted">
        <span>
          Pool:{" "}
          <span className="text-arena-cyan">{totalPool.toFixed(2)} MNT</span>
        </span>
        <span>
          Against AI:{" "}
          <span className="text-arena-red">{againstPool.toFixed(2)} MNT</span>
        </span>
      </div>
    </div>
  );
}
