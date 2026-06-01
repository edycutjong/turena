'use client';

import { useState, useEffect } from 'react';
import { TradeCycle } from '../lib/hooks/useTradeCycle';

export default function CounterTradeWindow({ activeCycle }: { activeCycle: TradeCycle | null }) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [betPlaced, setBetPlaced] = useState(false);

  useEffect(() => {
    // Reset state on new cycle
    if (!activeCycle || !activeCycle.intent) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTimeLeft(0);
       
      setBetPlaced(false);
      return;
    }

    // When intent appears, start 20s timer
    // We use a simple local interval since the backend enforces the exact timing
    setTimeLeft(20);
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [activeCycle]);

  const handleBet = () => {
    setBetPlaced(true);
    // TODO: Wire up actual smart contract call here in Phase 3
    console.log('Bet placed on cycle', activeCycle?.id);
  };

  if (!activeCycle) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <p className="uppercase tracking-widest text-sm">Awaiting Next Cycle</p>
      </div>
    );
  }

  const intentObj = activeCycle.intent ? (typeof activeCycle.intent === 'string' ? JSON.parse(activeCycle.intent) : activeCycle.intent) : null;

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center">
      {!intentObj ? (
        <div className="animate-pulse space-y-4">
          <div className="w-16 h-16 rounded-full border-4 border-cyan-500/30 border-t-cyan-500 animate-spin mx-auto"></div>
          <p className="text-cyan-400 font-mono tracking-widest uppercase text-sm">Agent is reasoning...</p>
        </div>
      ) : (
        <div className="space-y-8 w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-800 backdrop-blur-sm relative overflow-hidden">
          {/* Top warning bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>

          <div>
            <h2 className="text-slate-400 text-sm uppercase tracking-widest mb-2">Agent Intent Detected</h2>
            <div className="text-3xl font-bold text-white">
              <span className={intentObj.action === 'short' ? 'text-red-500' : 'text-green-500'}>
                {intentObj.action.toUpperCase()}
              </span>{' '}
              {intentObj.asset}
            </div>
            <p className="text-slate-500 mt-2 font-mono text-sm">
              Confidence: {(intentObj.confidence * 100).toFixed(1)}%
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm font-mono">
              <span className="text-slate-400">Counter-Trade Window</span>
              <span className={`${timeLeft > 0 ? 'text-red-400 font-bold' : 'text-slate-600'}`}>
                00:{timeLeft.toString().padStart(2, '0')}
              </span>
            </div>
            {/* Progress bar */}
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-red-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / 20) * 100}%` }}
              ></div>
            </div>
          </div>

          <button
            onClick={handleBet}
            disabled={timeLeft === 0 || betPlaced}
            className={`
              w-full py-4 rounded-xl font-bold uppercase tracking-widest transition-all
              ${betPlaced 
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                : timeLeft > 0
                  ? 'bg-red-500/10 text-red-500 border border-red-500 hover:bg-red-500 hover:text-white shadow-[0_0_15px_rgba(239,68,68,0.2)] hover:shadow-[0_0_25px_rgba(239,68,68,0.4)] cursor-pointer'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }
            `}
          >
            {betPlaced ? 'Trade Placed' : timeLeft > 0 ? 'Bet Against AI' : 'Window Closed'}
          </button>
        </div>
      )}
    </div>
  );
}
