"use client";

import { useState, useEffect, useRef } from "react";
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

export function SpectatorChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const cycle = useActiveCycle();
  const [bullishPercent, setBullishPercent] = useState(50);
  const [inputText, setInputText] = useState("");
  const [username] = useState(() => "Human-" + Math.floor(Math.random() * 1000));
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    const channel = supabase.channel(`chat-${cycle.id}-${Math.random().toString(36).slice(2, 8)}`)
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !cycle?.id) return;

    const msg = inputText.trim();
    setInputText("");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("spectator_chat").insert({
      cycle_id: cycle.id,
      username: username,
      message: msg,
      sentiment: "NEUTRAL",
    });
  };

  return (
    <div className="w-full h-full border-l border-zinc-800 bg-zinc-950 flex flex-col font-mono text-sm">
      <div className="px-4 py-2 border-b border-zinc-800">
        <h3 className="text-zinc-100 font-bold mb-1">LIVE ARENA CHAT</h3>
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
      
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
        <div ref={messagesEndRef} />
      </div>

      <div className="p-2 border-t border-zinc-800 bg-zinc-950/80">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Send a message..."
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500 transition-colors"
            maxLength={100}
          />
          <button
            type="submit"
            disabled={!inputText.trim() || !cycle?.id}
            className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-100 px-4 py-2 rounded font-bold transition-colors"
          >
            Chat
          </button>
        </form>
      </div>
    </div>
  );
}
