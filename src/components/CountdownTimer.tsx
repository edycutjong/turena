"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { playTick, playUrgentTick } from "@/lib/sounds";

interface Props {
  durationSeconds: number;
  startedAt: Date | null;
  onExpire?: () => void;
}

export function CountdownTimer({ durationSeconds, startedAt, onExpire }: Props) {
  const [remaining, setRemaining] = useState(() => durationSeconds);
  const lastTickRef = useRef<number>(-1);

  useEffect(() => {
    if (!startedAt) {
      const timer = setTimeout(() => {
        setRemaining(durationSeconds);
        lastTickRef.current = -1;
      }, 0);
      return () => clearTimeout(timer);
    }

    const tick = () => {
      const elapsed = (Date.now() - startedAt.getTime()) / 1000;
      const left = Math.max(0, durationSeconds - elapsed);
      setRemaining(left);

      const second = Math.ceil(left);
      if (second !== lastTickRef.current && left > 0) {
        lastTickRef.current = second;
        if (left <= 5) playUrgentTick();
        else playTick();
      }

      if (left <= 0) onExpire?.();
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startedAt, durationSeconds, onExpire]);

  const pct = remaining / durationSeconds;
  const isUrgent = remaining <= 5;

  // SVG circular progress
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = circ * pct;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-36 h-36">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r={r} fill="none" strokeWidth="6"
            className="stroke-arena-border" />
          {/* Progress */}
          <motion.circle
            cx="60" cy="60" r={r} fill="none" strokeWidth="6"
            strokeLinecap="round"
            stroke={isUrgent ? "#ef4444" : "#06b6d4"}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ - dash }}
            animate={{ strokeDashoffset: circ - dash }}
            transition={{ duration: 0.1 }}
          />
        </svg>

        {/* Number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.span
              key={Math.ceil(remaining)}
              className={`font-terminal font-bold text-4xl tabular-nums
                ${isUrgent ? "text-arena-red" : "text-arena-cyan"}`}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1,   opacity: 1 }}
              exit={{    scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {Math.ceil(remaining)}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <span className={`font-terminal text-xs tracking-widest uppercase
        ${isUrgent ? "text-arena-red animate-pulse" : "text-arena-muted"}`}>
        {startedAt ? (remaining > 0 ? "counter window open" : "window closed") : "waiting"}
      </span>
    </div>
  );
}
