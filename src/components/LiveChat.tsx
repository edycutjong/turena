"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Message { id: string; user: string; text: string; created_at: string; }

// Simple anon name stored in sessionStorage
function getAnonName(): string {
  if (typeof window === "undefined") return "anon";
  const key = "arena_name";
  const stored = sessionStorage.getItem(key);
  if (stored) return stored;
  const name = `viewer_${Math.floor(Math.random() * 9999)}`;
  sessionStorage.setItem(key, name);
  return name;
}

export function LiveChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const username = useRef(getAnonName());

  useEffect(() => {
    // Supabase Realtime broadcast channel for chat (no DB persistence needed)
    const channel = supabase
      .channel("live-chat")
      .on("broadcast", { event: "chat" }, ({ payload }) => {
        setMessages((prev) => [...prev.slice(-99), payload as Message]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    const msg: Message = {
      id: crypto.randomUUID(),
      user: username.current,
      text,
      created_at: new Date().toISOString(),
    };
    // Broadcast — no DB write needed for ephemeral chat
    await (supabase.channel("live-chat") as unknown as {
      send: (opts: object) => Promise<void>
    }).send({ type: "broadcast", event: "chat", payload: msg });
    setMessages((prev) => [...prev.slice(-99), msg]);
  };

  return (
    <div className="flex flex-col h-full glass rounded-xl overflow-hidden">
      <div className="px-4 py-2 border-b border-arena-border">
        <span className="font-terminal text-xs text-arena-muted tracking-widest uppercase">Live Chat</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <p className="font-terminal text-xs text-arena-muted italic">No messages yet…</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className="font-terminal text-xs">
            <span className="text-arena-cyan">{m.user}</span>
            <span className="text-arena-muted mx-1">›</span>
            <span className="text-arena-text">{m.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex border-t border-arena-border">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type a message…"
          className="flex-1 bg-transparent px-3 py-2 font-terminal text-xs text-arena-text placeholder:text-arena-muted outline-none"
        />
        <button
          onClick={send}
          className="px-3 py-2 font-terminal text-xs text-arena-cyan hover:text-white transition-colors"
        >
          Send
        </button>
      </div>
    </div>
  );
}
