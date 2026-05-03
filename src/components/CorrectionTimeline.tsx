"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";
import { MANTLE_EXPLORER } from "@/lib/escrow";

type SelfCorrection = Database["public"]["Tables"]["self_corrections"]["Row"];

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

import { motion } from "framer-motion";

function AnimatedProgressBar({ value, improved }: { value: number; improved: boolean }) {
  return (
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(100, Math.abs(value) * 100)}%` }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`h-full rounded-full ${
        improved ? "bg-arena-green" : "bg-arena-red"
      }`}
    />
  );
}

export function CorrectionTimeline() {
  const [corrections, setCorrections] = useState<SelfCorrection[]>([]);

  useEffect(() => {
    supabase
      .from("self_corrections")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => {
        if (data) setCorrections(data as SelfCorrection[]);
      });

    const channel = supabase
      .channel("correction-timeline")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "self_corrections" },
        (payload) => {
          setCorrections((prev) => [payload.new as SelfCorrection, ...prev].slice(0, 20));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  if (corrections.length === 0) {
    return (
      <div className="glass rounded-xl p-6">
        <p className="font-terminal text-xs text-arena-muted uppercase tracking-widest mb-4">
          Agent Correction Timeline
        </p>
        <p className="font-terminal text-sm text-arena-muted italic text-center py-4">
          No corrections yet — agent is learning.
        </p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-arena-border">
        <span className="font-terminal text-xs text-arena-muted uppercase tracking-widest">
          Agent Correction Timeline
        </span>
      </div>
      <div className="relative px-4 py-4 max-h-80 overflow-y-auto">
        {/* Vertical rail */}
        <div className="absolute left-8 top-0 bottom-0 w-px bg-arena-purple/20" />

        <div className="space-y-6">
          {corrections.map((c, i) => {
            const delta = Number(c.new_value) - Number(c.old_value);
            const improved = delta < 0
              ? c.parameter_changed.includes("tolerance") || c.parameter_changed.includes("threshold")
              : true;

            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease: "easeOut" }}
                className="flex gap-4 relative"
              >
                {/* Timeline dot */}
                <div className="relative shrink-0 w-8 flex items-center justify-center">
                  <div
                    className={`w-3 h-3 rounded-full border-2 z-10 ${
                      i === 0
                        ? "bg-arena-purple border-arena-purple animate-pulse"
                        : "bg-arena-surface border-arena-purple/50"
                    }`}
                  />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-2">
                    <span className="font-terminal text-xs font-bold text-arena-purple">
                      ⚡ {c.parameter_changed}
                    </span>
                    <span className="font-terminal text-xs text-arena-muted whitespace-nowrap">
                      {formatDate(c.created_at)} {formatTime(c.created_at)}
                    </span>
                  </div>

                  {/* Param change bar */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-terminal text-xs text-arena-red tabular-nums w-16 text-right">
                      {Number(c.old_value).toFixed(4)}
                    </span>
                    <div className="flex-1 h-1.5 bg-arena-border rounded-full overflow-hidden">
                      <AnimatedProgressBar value={Number(c.new_value)} improved={improved} />
                    </div>
                    <span className="font-terminal text-xs text-arena-green tabular-nums w-16">
                      {Number(c.new_value).toFixed(4)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-terminal text-xs text-arena-muted">
                      Regret: <span className="text-arena-purple font-bold">{c.regret_score}</span>
                    </span>
                    {c.tx_hash && (
                      <a
                        href={`${MANTLE_EXPLORER}/tx/${c.tx_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-terminal text-xs text-arena-cyan hover:underline"
                      >
                        ↗ {c.tx_hash.slice(0, 10)}…
                      </a>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
