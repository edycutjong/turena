"use client";
import { useEffect, useRef } from "react";
import { useSabotageEvents } from "@/hooks/useSabotageEvents";
import { FUD_CARDS } from "@/components/FudCardPanel";

interface Props {
  cycleId: string | null;
}

export function SabotageFeed({ cycleId }: Props) {
  const { events } = useSabotageEvents(cycleId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [events.length]);

  if (!events.length) return null;

  return (
    <div className="px-2 pb-1">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1 px-2
          rounded border border-orange-500/15 bg-orange-950/10"
        style={{ scrollBehavior: "smooth" }}
      >
        <span className="font-terminal text-[10px] text-orange-400/60 shrink-0 uppercase tracking-widest">
          FUD ›
        </span>
        {events.map((ev) => {
          const card = FUD_CARDS.find((c) => c.label === ev.card_type);
          return (
            <span
              key={ev.id}
              className="shrink-0 flex items-center gap-1 font-terminal text-[10px]
                text-orange-300/80 animate-in fade-in slide-in-from-right-2 duration-300"
            >
              <span>{card?.emoji ?? "🎴"}</span>
              <span>{ev.card_type}</span>
              <span className="text-orange-500/50">{ev.mnt_paid} MNT</span>
              <span className="text-orange-500/20 mx-0.5">·</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
