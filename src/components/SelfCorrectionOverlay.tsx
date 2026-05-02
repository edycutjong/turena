"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSelfCorrections } from "@/hooks/useSelfCorrections";
import { playCorrection } from "@/lib/sounds";

const MANTLE_EXPLORER = "https://explorer.sepolia.mantle.xyz";

export function SelfCorrectionOverlay() {
  const { latest } = useSelfCorrections();
  const [visible, setVisible] = useState(() => false);
  const [shown, setShown] = useState<string | null>(() => null);

  useEffect(() => {
    if (latest && latest.id !== shown) {
      const t1 = setTimeout(() => {
        setShown(latest.id);
        setVisible(true);
        playCorrection();
      }, 0);
      const t2 = setTimeout(() => setVisible(false), 6000);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }
  }, [latest, shown]);

  return (
    <AnimatePresence>
      {visible && latest && (
        <>
          {/* Full-screen red flash */}
          <motion.div
            className="fixed inset-0 pointer-events-none z-40 bg-arena-red/10"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0.6, 0] }}
            transition={{ duration: 0.6 }}
          />

          {/* Overlay card */}
          <motion.div
            className="fixed bottom-6 right-6 z-50 w-80 bg-[#0f0f1a] border border-arena-red rounded-xl shadow-2xl shadow-arena-red/40 overflow-hidden"
            initial={{ x: 80, opacity: 0 }}
            animate={{ x: 0,  opacity: 1 }}
            exit={{    x: 80, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* Red header bar */}
            <div className="flex items-center gap-2 px-4 py-3 bg-arena-red/30 border-b border-arena-red/60">
              <span className="w-2 h-2 rounded-full bg-arena-red animate-pulse" />
              <span className="font-terminal text-xs text-arena-red font-bold tracking-widest uppercase">
                Self-Correction Triggered
              </span>
            </div>

            <div className="px-4 py-3 space-y-2 bg-[#0f0f1a]">
              <div className="flex justify-between items-center">
                <span className="font-terminal text-xs text-arena-muted">Parameter</span>
                <span className="font-terminal text-sm text-arena-text font-bold">
                  {latest.parameter_changed}
                </span>
              </div>

              <div className="flex items-center gap-2 font-terminal text-sm">
                <span className="text-arena-red tabular-nums">{Number(latest.old_value).toFixed(4)}</span>
                <span className="text-arena-muted">→</span>
                <span className="text-arena-green tabular-nums">{Number(latest.new_value).toFixed(4)}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="font-terminal text-xs text-arena-muted">Regret Score</span>
                <span className="font-terminal text-sm text-arena-purple font-bold">
                  {latest.regret_score}
                </span>
              </div>

              {latest.tx_hash && (
                <a
                  href={`${MANTLE_EXPLORER}/tx/${latest.tx_hash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block font-terminal text-xs text-arena-cyan hover:underline truncate"
                >
                  ↗ {latest.tx_hash.slice(0, 22)}… (Mantle Explorer)
                </a>
              )}
            </div>

            {/* Progress bar auto-dismiss */}
            <motion.div
              className="h-0.5 bg-arena-red"
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 6, ease: "linear" }}
              style={{ transformOrigin: "left" }}
            />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
