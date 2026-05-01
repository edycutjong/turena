"use client";
import { motion, AnimatePresence } from "framer-motion";

interface Intent {
  action: "long" | "short";
  asset: string;
  confidence: number;
}

interface Props {
  intent: Intent | null;
  visible: boolean;
}

const ACTION_COLOR = {
  long:  "text-arena-green border-arena-green",
  short: "text-arena-red   border-arena-red",
};

export function IntentAnnouncement({ intent, visible }: Props) {
  return (
    <AnimatePresence>
      {visible && intent && (
        <motion.div
          initial={{ opacity: 0, y: -16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0,   scale: 1    }}
          exit={{    opacity: 0, y: -8,  scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className={`border rounded-lg px-6 py-4 text-center
            bg-arena-surface/80 backdrop-blur
            ${ACTION_COLOR[intent.action]}`}
        >
          <p className="font-terminal text-xs text-arena-muted tracking-widest uppercase mb-1">
            AI Decision
          </p>
          <p className="font-terminal text-2xl font-bold">
            I am{" "}
            <span className={intent.action === "long" ? "text-arena-green" : "text-arena-red"}>
              {intent.action.toUpperCase()}ING
            </span>{" "}
            {intent.asset}
          </p>
          <p className="font-terminal text-sm text-arena-muted mt-1">
            Confidence: {(intent.confidence * 100).toFixed(0)}%
          </p>
          <p className={`font-terminal text-xs mt-3 font-bold tracking-wider
            ${intent.action === "long" ? "text-arena-green" : "text-arena-red"}`}>
            COUNTER?
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
