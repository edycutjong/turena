"use client";

import { useEffect, useRef, useState } from "react";
import { useCoTStream } from "@/hooks/useCoTStream";

interface Props {
  cycleId: string | null;
}

export function CoTTerminal({ cycleId }: Props) {
  const tokens = useCoTStream(cycleId);
  const endRef = useRef<HTMLDivElement>(null);
  const [initialTokens] = useState(() => new Set(tokens.map(t => t.id)));

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tokens]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-cyan-400 font-mono p-4 rounded-xl border border-arena-border shadow-2xl overflow-hidden relative scanlines">
      {/* Terminal title bar */}
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-arena-border/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <div className="w-3 h-3 rounded-full bg-yellow-500" />
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="ml-2 text-xs text-arena-muted uppercase tracking-widest">
            Turena OS // CoT Stream
          </span>
        </div>
        {cycleId ? (
          <span className="text-xs text-arena-cyan animate-pulse uppercase">● Live</span>
        ) : (
          <span className="text-xs text-arena-muted uppercase">○ Idle</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto text-sm tracking-tight pb-10 relative z-10">
        {!cycleId && tokens.length === 0 && (
          <div className="text-slate-600 animate-pulse">
            Waiting for cycle initiation...
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">
          {tokens.map((token) => {
            const isNew = !initialTokens.has(token.id);
            return (
              <span
                key={token.id}
                className={`
                  ${isNew ? "token-in" : ""}
                  ${token.token_type === "reasoning" ? "text-slate-400" : ""}
                  ${token.token_type === "intent" ? "text-cyan-300 font-bold bg-cyan-900/20 px-1 rounded" : ""}
                  ${token.token_type === "correction" ? "text-amber-400 font-bold" : ""}
                `}
              >
                {token.token_text}
              </span>
            );
          })}
          <span className="animate-ping ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle" />
        </div>

        <div ref={endRef} />
      </div>
    </div>
  );
}

// Keep default export for backward compat
export default CoTTerminal;
