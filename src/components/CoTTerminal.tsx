"use client";
import { useEffect, useRef, useState } from "react";
import { useCoTStream } from "@/hooks/useCoTStream";
import type { Database } from "@/lib/database.types";

type TokenType = Database["public"]["Tables"]["cot_tokens"]["Row"]["token_type"];

interface Props {
  cycleId: string | null;
}

const TOKEN_COLORS: Record<TokenType, string> = {
  reasoning: "text-arena-cyan",
  intent:    "text-yellow-400",
  correction: "text-arena-red",
};

const TOKEN_PREFIX: Record<TokenType, string> = {
  reasoning:  "",
  intent:     "\n[INTENT] ",
  correction: "\n[CORRECTION] ",
};

export function CoTTerminal({ cycleId }: Props) {
  const tokens = useCoTStream(cycleId);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [displayed, setDisplayed] = useState<typeof tokens>([]);
  const queueRef = useRef<typeof tokens>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when cycle changes
  useEffect(() => {
    setDisplayed([]);
    queueRef.current = [];
  }, [cycleId]);

  // Typewriter: drip tokens from queue every ~30ms
  useEffect(() => {
    const incoming = tokens.slice(displayed.length + queueRef.current.length);
    if (incoming.length > 0) {
      queueRef.current = [...queueRef.current, ...incoming];
    }

    if (timerRef.current) return;

    const drip = () => {
      if (queueRef.current.length === 0) {
        timerRef.current = null;
        return;
      }
      const next = queueRef.current.shift()!;
      setDisplayed((prev) => [...prev, next]);
      timerRef.current = setTimeout(drip, 28);
    };

    timerRef.current = setTimeout(drip, 28);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
    };
  }, [tokens, displayed.length]);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayed]);

  return (
    <div className="flex flex-col h-full bg-arena-surface border border-arena-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-arena-border bg-black/30">
        <span className="w-3 h-3 rounded-full bg-arena-red" />
        <span className="w-3 h-3 rounded-full bg-yellow-500" />
        <span className="w-3 h-3 rounded-full bg-arena-green" />
        <span className="ml-3 font-terminal text-xs text-arena-muted tracking-widest uppercase">
          Agent Reasoning
        </span>
        {cycleId && (
          <span className="ml-auto font-terminal text-xs text-arena-muted">
            cycle {cycleId.slice(0, 8)}
          </span>
        )}
      </div>

      {/* Token stream */}
      <div className="flex-1 overflow-y-auto p-4 font-terminal text-sm leading-relaxed">
        {!cycleId && (
          <p className="text-arena-muted italic">
            Waiting for next trade cycle…
          </p>
        )}

        {displayed.map((token) => (
          <span
            key={token.id}
            className={TOKEN_COLORS[token.token_type]}
          >
            {TOKEN_PREFIX[token.token_type]}
            {token.token_text}
          </span>
        ))}

        {/* Blinking cursor */}
        {cycleId && (
          <span className="inline-block w-2 h-4 bg-arena-cyan ml-0.5 animate-pulse" />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
