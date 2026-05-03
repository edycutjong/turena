"use client";

import { useEffect, useRef, useState } from "react";
import { useCoTStream } from "@/hooks/useCoTStream";

type EmotionState = "CONFIDENT" | "CAUTIOUS" | "ANXIOUS" | "TILTED" | "MELTDOWN";

const EMOTION_STYLES: Record<EmotionState, { label: string; color: string; bg: string }> = {
  CONFIDENT: { label: "CONFIDENT", color: "text-arena-cyan",   bg: "" },
  CAUTIOUS:  { label: "CAUTIOUS",  color: "text-yellow-400",   bg: "" },
  ANXIOUS:   { label: "ANXIOUS",   color: "text-orange-400",   bg: "" },
  TILTED:    { label: "TILTED",    color: "text-red-400",      bg: "bg-tilted" },
  MELTDOWN:  { label: "MELTDOWN",  color: "text-red-500",      bg: "bg-meltdown" },
};

interface Props {
  cycleId: string | null;
  onEmotionChange?: (emotion: EmotionState) => void;
}

export function CoTTerminal({ cycleId, onEmotionChange }: Props) {
  const tokens = useCoTStream(cycleId);
  const endRef = useRef<HTMLDivElement>(null);
  const [initialTokens] = useState(() => new Set(tokens.map(t => t.id)));
  const [emotion, setEmotion] = useState<EmotionState>("CONFIDENT");

  // Derive current emotion from latest emotion token in the stream
  useEffect(() => {
    const emotionTokens = tokens.filter(t => t.token_type === "emotion");
    if (emotionTokens.length > 0) {
      const latest = emotionTokens[emotionTokens.length - 1].token_text as EmotionState;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEmotion(latest);
      onEmotionChange?.(latest);
    }
  }, [tokens, onEmotionChange]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [tokens]);

  const style = EMOTION_STYLES[emotion];
  const isMeltdown = emotion === "MELTDOWN";
  const isTilted   = emotion === "TILTED";

  return (
    <div
      className={`flex flex-col h-full bg-slate-950 text-cyan-400 font-mono p-4 rounded-xl border overflow-hidden relative scanlines transition-all duration-500
        ${isMeltdown ? "border-red-500/60 glow-red " + style.bg : ""}
        ${isTilted   ? "border-orange-500/40 " + style.bg : ""}
        ${!isMeltdown && !isTilted ? "border-arena-border glow-cyan" : ""}
      `}
    >
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
        <div className="flex items-center gap-3">
          {/* Emotion badge */}
          <span className={`font-terminal text-xs font-bold uppercase tracking-widest px-2 py-0.5 rounded border
            ${isMeltdown ? "border-red-500/60 text-red-400 bg-red-900/20 animate-pulse" : ""}
            ${isTilted   ? "border-orange-500/40 text-orange-400 bg-orange-900/10" : ""}
            ${emotion === "ANXIOUS"   ? "border-orange-400/30 text-orange-300" : ""}
            ${emotion === "CAUTIOUS"  ? "border-yellow-400/30 text-yellow-300" : ""}
            ${emotion === "CONFIDENT" ? "border-arena-cyan/30 text-arena-cyan" : ""}
          `}>
            {style.label}
          </span>
          {cycleId ? (
            <span className="text-xs text-arena-cyan animate-pulse uppercase">● Live</span>
          ) : (
            <span className="text-xs text-arena-muted uppercase">○ Idle</span>
          )}
        </div>
      </div>

      <div
        className={`flex-1 overflow-y-auto text-sm tracking-tight pb-10 relative z-10
          ${isMeltdown ? "emotion-meltdown" : ""}
          ${isTilted   ? "emotion-tilted" : ""}
        `}
      >
        {!cycleId && tokens.length === 0 && (
          <div className="text-slate-600 animate-pulse">
            Waiting for cycle initiation...
          </div>
        )}

        <div className="whitespace-pre-wrap break-words">
          {tokens.map((token) => {
            if (token.token_type === "emotion") return null; // rendered as badge, not inline
            const isNew = !initialTokens.has(token.id);
            return (
              <span
                key={token.id}
                className={`
                  ${isNew ? "token-in" : ""}
                  ${token.token_type === "reasoning"  ? "text-slate-400" : ""}
                  ${token.token_type === "intent"     ? "text-cyan-300 font-bold bg-cyan-900/20 px-1 rounded" : ""}
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

export type { EmotionState };
export default CoTTerminal;
