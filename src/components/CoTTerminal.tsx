'use client';

import { useEffect, useRef } from 'react';
import { useRealtimeCoT } from '../lib/hooks/useRealtimeCoT';

export default function CoTTerminal({ activeCycleId }: { activeCycleId: string | null }) {
  const tokens = useRealtimeCoT(activeCycleId);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [tokens]);

  return (
    <div className="flex flex-col h-full bg-slate-950 text-cyan-400 font-mono p-4 rounded-xl border border-slate-800 shadow-2xl overflow-hidden relative">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/50">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span className="ml-2 text-xs text-slate-500 uppercase tracking-widest">Turena OS // CoT Stream</span>
        </div>
        {activeCycleId ? (
          <span className="text-xs text-cyan-500 animate-pulse uppercase">● Live</span>
        ) : (
          <span className="text-xs text-slate-500 uppercase">○ Idle</span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-1 text-sm tracking-tight custom-scrollbar pb-10">
        {!activeCycleId && tokens.length === 0 && (
          <div className="text-slate-600 animate-pulse">Waiting for cycle initiation...</div>
        )}
        
        <div className="whitespace-pre-wrap break-words">
          {tokens.map((token) => (
            <span
              key={token.id}
              className={`
                ${token.token_type === 'reasoning' ? 'text-slate-400' : ''}
                ${token.token_type === 'intent' ? 'text-cyan-300 font-bold bg-cyan-900/20 px-1 rounded' : ''}
                ${token.token_type === 'correction' ? 'text-amber-400 font-bold' : ''}
              `}
            >
              {token.token_text}
            </span>
          ))}
          <span className="animate-ping ml-1 inline-block w-2 h-4 bg-cyan-400 align-middle"></span>
        </div>
        
        <div ref={endOfMessagesRef} />
      </div>
    </div>
  );
}
