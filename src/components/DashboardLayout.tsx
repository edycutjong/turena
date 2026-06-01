'use client';

import { useTradeCycle } from '../lib/hooks/useTradeCycle';
import CoTTerminal from './CoTTerminal';
import CounterTradeWindow from './CounterTradeWindow';

export default function DashboardLayout() {
  const { activeCycle, cycles } = useTradeCycle();

  // Calculate simple stats from recent cycles
  const totalTrades = cycles.filter(c => c.result !== 'pending').length;
  const wins = cycles.filter(c => c.result === 'win').length;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '0.0';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 font-sans selection:bg-cyan-500/30 overflow-hidden flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold tracking-widest text-white flex items-center gap-2">
            <span className="text-cyan-500">TURENA</span> 
            <span className="text-slate-600">|</span> 
            <span className="text-sm font-mono text-slate-400">AGENT-8004</span>
          </div>
        </div>
        <div className="flex items-center gap-6 font-mono text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase text-xs">ELO</span>
            <span className="text-white font-bold">1247</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase text-xs">Win Rate</span>
            <span className={Number(winRate) > 50 ? 'text-green-400 font-bold' : 'text-slate-300 font-bold'}>{winRate}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 uppercase text-xs">Status</span>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></div>
              <span>ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden p-4 gap-4">
        
        {/* Left Column (Market & Action) */}
        <div className="flex-1 flex flex-col gap-4 relative">
          
          {/* Main Visual / Market Area */}
          <div className="flex-1 bg-slate-900 rounded-xl border border-slate-800 relative overflow-hidden flex items-center justify-center">
            {/* Background decorative grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)', backgroundSize: '40px 40px' }}></div>
            
            {/* The Counter Trade Overlay takes over this area when active */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              <CounterTradeWindow activeCycle={activeCycle} />
            </div>

            {/* Dummy Market Price indicator in corner */}
            <div className="absolute top-4 left-4 z-0">
              <div className="text-slate-500 text-xs font-mono uppercase">MNT/USDT</div>
              <div className="text-2xl font-mono text-slate-300">0.9842 <span className="text-green-500 text-sm">↑</span></div>
            </div>
          </div>

          {/* Bottom Bar: History */}
          <div className="h-48 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col">
            <div className="px-4 py-2 border-b border-slate-800 text-xs font-mono uppercase text-slate-500 tracking-wider">
              Recent Trades
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              <table className="w-full text-sm font-mono text-left">
                <thead className="text-slate-500 sticky top-0 bg-slate-900">
                  <tr>
                    <th className="pb-2 font-normal">Cycle</th>
                    <th className="pb-2 font-normal">Intent</th>
                    <th className="pb-2 font-normal text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {cycles.filter(c => c.result !== 'pending').slice(0, 5).map((cycle) => {
                    const intent = typeof cycle.intent === 'string' ? JSON.parse(cycle.intent) : (cycle.intent || {});
                    return (
                      <tr key={cycle.id} className="group hover:bg-slate-800/30">
                        <td className="py-2 text-slate-400">#{cycle.cycle_number}</td>
                        <td className="py-2">
                          <span className={intent.action === 'short' ? 'text-red-400' : 'text-green-400'}>
                            {intent.action?.toUpperCase() || 'UNKNOWN'}
                          </span> {intent.asset || 'MNTUSDT'}
                        </td>
                        <td className="py-2 text-right">
                          <span className={cycle.result === 'win' ? 'text-green-500' : 'text-red-500'}>
                            {cycle.pnl_mnt ? (cycle.pnl_mnt > 0 ? '+' : '') + cycle.pnl_mnt.toFixed(2) : cycle.result.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {cycles.filter(c => c.result !== 'pending').length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-600">No recent trades</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (CoT Terminal) */}
        <div className="w-[450px] shrink-0">
          <CoTTerminal cycleId={activeCycle?.id || null} />
        </div>

      </main>
    </div>
  );
}
