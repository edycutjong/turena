"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useActiveCycle } from "@/hooks/useActiveCycle";

interface ChatMessage {
  id: string;
  cycle_id: string;
  username: string;
  message: string;
  sentiment: string;
  created_at: string;
}

export function SpectatorChat({}: { isLiveMode?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const cycle = useActiveCycle();
  const [bullishPercent, setBullishPercent] = useState(50);

  useEffect(() => {
    if (!cycle?.id) return;
    
    // Fetch recent
    supabase.from("spectator_chat")
      .select("*")
      .eq("cycle_id", cycle.id)
      .order("created_at", { ascending: false })
      .limit(15)
      .then(({ data }) => {
        if (data) setMessages(data.reverse());
      });

    // Subscribe
    const channel = supabase.channel(`chat-${cycle.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "spectator_chat", filter: `cycle_id=eq.${cycle.id}` },
        (payload) => {
          const newMsg = payload.new as ChatMessage;
          setMessages(prev => [...prev.slice(-14), newMsg]);
          
          if (newMsg.sentiment === 'BULLISH') setBullishPercent(p => Math.min(100, p + 10));
          if (newMsg.sentiment === 'BEARISH') setBullishPercent(p => Math.max(0, p - 10));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [cycle?.id]);

  return (
    <div className="w-80 h-full border-l border-zinc-800 bg-zinc-950 flex flex-col font-mono text-sm">
      <div className="p-4 border-b border-zinc-800">
        <h3 className="text-zinc-100 font-bold mb-2">LIVE ARENA CHAT</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">CROWD SENTIMENT</span>
          <div className="flex-1 h-2 bg-red-900/50 rounded-full overflow-hidden flex">
            <div 
              className="h-full bg-green-500 transition-all duration-500" 
              style={{ width: `${bullishPercent}%` }} 
            />
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id || msg.created_at} className="flex gap-2 animate-in fade-in slide-in-from-bottom-2">
            <div className="text-xl">
              {msg.sentiment === "BULLISH" ? "🚀" : msg.sentiment === "BEARISH" ? "🐻" : msg.sentiment === "TROLL" ? "🤡" : "👀"}
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className={`font-bold ${msg.sentiment === 'BULLISH' ? 'text-green-400' : msg.sentiment === 'BEARISH' ? 'text-red-400' : 'text-zinc-300'}`}>
                  {msg.username}
                </span>
                <span className="text-xs text-zinc-600">@{msg.username.toLowerCase()}</span>
              </div>
              <p className="text-zinc-400 mt-1">{msg.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
