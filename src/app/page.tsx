import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TuringArena — Watch AI Trade. Bet Against It.",
  description:
    "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window. Every decision recorded on Mantle.",
  openGraph: {
    title: "TuringArena — Watch AI Trade. Bet Against It.",
    description:
      "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window. Every decision recorded on Mantle.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TuringArena — Watch AI Trade. Bet Against It.",
    description:
      "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window.",
  },
};

const STEPS = [
  {
    n: "01",
    title: "AI Reasons Out Loud",
    body: "DeepSeek R1's chain-of-thought streams live to your screen — every token, every doubt, every confidence score.",
    color: "text-arena-cyan",
    border: "border-arena-cyan/30",
    glow: "glow-cyan",
  },
  {
    n: "02",
    title: "15-Second Window Opens",
    body: "The moment the agent announces its trade intent, a 15-second countdown begins. Counter-trade or watch.",
    color: "text-arena-red",
    border: "border-arena-red/30",
    glow: "glow-red",
  },
  {
    n: "03",
    title: "Everything On-Chain",
    body: "Trade results, self-corrections, and counter-trade bets are recorded on Mantle via ERC-8004. Judges can verify.",
    color: "text-arena-green",
    border: "border-arena-green/30",
    glow: "glow-green",
  },
];

const STACK = [
  { label: "Mantle", sub: "ERC-8004 on-chain recording" },
  { label: "DeepSeek R1", sub: "Streaming chain-of-thought" },
  { label: "Supabase", sub: "Realtime postgres_changes" },
  { label: "Next.js 16", sub: "App Router + Server Actions" },
  { label: "Hardhat", sub: "Smart contract deployment" },
  { label: "viem", sub: "Wallet + contract calls" },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-arena-bg flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-arena-border glass sticky top-0 z-20">
        <span className="font-terminal text-arena-cyan font-bold text-lg tracking-tight">
          TuringArena
        </span>
        <div className="flex items-center gap-4 font-terminal text-xs text-arena-muted">
          <Link href="/leaderboard" className="hover:text-arena-cyan transition-colors">Leaderboard</Link>
          <Link href="/replay" className="hover:text-arena-cyan transition-colors">Replay</Link>
          <Link
            href="/arena"
            className="px-4 py-1.5 rounded border border-arena-cyan text-arena-cyan hover:bg-arena-cyan/10 transition-colors"
          >
            Enter Arena →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center px-6 pt-24 pb-16 relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(to right, #888 1px, transparent 1px), linear-gradient(to bottom, #888 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Radial glow */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(6,182,212,0.08),transparent)]" />

        <div className="relative z-10 max-w-3xl mx-auto">
          <p className="font-terminal text-xs text-arena-cyan tracking-[0.3em] uppercase mb-4">
            Mantle Hackathon 2026 · ERC-8004
          </p>
          <h1 className="font-terminal text-5xl md:text-7xl font-bold text-arena-text leading-tight mb-6">
            Watch AI Trade.{" "}
            <span className="text-arena-cyan">Bet Against It.</span>
          </h1>
          <p className="text-arena-muted text-lg md:text-xl max-w-xl mx-auto mb-10 leading-relaxed">
            A live AI trading agent streams its chain-of-thought in real time.
            You get 15 seconds to counter-trade. Every decision is recorded
            on Mantle — verifiable by anyone.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/arena"
              className="glass glow-cyan px-8 py-3 rounded-lg border border-arena-cyan text-arena-cyan font-terminal font-bold text-sm tracking-wider hover:bg-arena-cyan/10 transition-all duration-200"
            >
              Enter the Arena →
            </Link>
            <Link
              href="/leaderboard"
              className="px-8 py-3 rounded-lg border border-arena-border text-arena-muted font-terminal text-sm tracking-wider hover:border-arena-muted/60 hover:text-arena-text transition-all duration-200"
            >
              View Leaderboard
            </Link>
          </div>
        </div>

        {/* Terminal preview window */}
        <div className="relative z-10 mt-16 w-full max-w-2xl mx-auto glass rounded-xl border border-arena-border overflow-hidden shadow-2xl">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-arena-border bg-arena-surface/60">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="ml-2 font-terminal text-xs text-arena-muted tracking-widest">
              Turena OS // CoT Stream — Live
            </span>
            <span className="ml-auto font-terminal text-xs text-arena-cyan animate-pulse">● LIVE</span>
          </div>
          <div className="px-6 py-5 font-terminal text-sm text-left space-y-1">
            <p className="text-slate-500">{">"} Fetching MNTUSDT market context...</p>
            <p className="text-slate-400">{">"} <span className="text-cyan-300">[reasoning]</span> The 4h RSI is sitting at 61, not yet overbought but momentum is clearly to the upside. Volume profile shows strong support at 0.94...</p>
            <p className="text-slate-400">{">"} <span className="text-cyan-300">[reasoning]</span> However the 1h shows a potential double-top forming. Risk/reward tilts short if price rejects 0.99...</p>
            <p className="text-cyan-300 font-bold">{">"} <span className="bg-cyan-900/30 px-1 rounded">[intent]</span> {"{"} action: &quot;SHORT&quot;, asset: &quot;MNTUSDT&quot;, confidence: 0.72 {"}"}</p>
            <p className="text-slate-600 animate-pulse">▋</p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-20 max-w-5xl mx-auto w-full">
        <h2 className="font-terminal text-2xl font-bold text-arena-text text-center mb-12 tracking-tight">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className={`glass rounded-xl p-6 border ${step.border} ${step.glow} transition-all duration-300 hover:scale-[1.02]`}
            >
              <p className={`font-terminal text-3xl font-bold mb-3 ${step.color}`}>{step.n}</p>
              <h3 className="font-terminal text-base font-bold text-arena-text mb-2">{step.title}</h3>
              <p className="text-arena-muted text-sm leading-relaxed">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tech stack */}
      <section className="px-6 py-16 max-w-5xl mx-auto w-full border-t border-arena-border">
        <h2 className="font-terminal text-sm text-arena-muted text-center tracking-[0.3em] uppercase mb-8">
          Built with
        </h2>
        <div className="flex flex-wrap justify-center gap-3">
          {STACK.map((s) => (
            <div
              key={s.label}
              className="glass rounded-lg px-4 py-3 border border-arena-border hover:border-arena-cyan/30 transition-colors group"
            >
              <p className="font-terminal text-sm font-bold text-arena-text group-hover:text-arena-cyan transition-colors">
                {s.label}
              </p>
              <p className="font-terminal text-xs text-arena-muted mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 py-20 text-center border-t border-arena-border">
        <p className="font-terminal text-arena-muted text-sm mb-6">
          Every trade, every correction, every bet — on Mantle.
        </p>
        <Link
          href="/arena"
          className="glass glow-cyan inline-block px-10 py-4 rounded-lg border border-arena-cyan text-arena-cyan font-terminal font-bold text-base tracking-wider hover:bg-arena-cyan/10 transition-all duration-200"
        >
          Enter the Arena →
        </Link>
      </section>

      <footer className="px-6 py-6 border-t border-arena-border text-center">
        <p className="font-terminal text-xs text-arena-muted">
          TuringArena · Built on Mantle · Hackathon 2026
        </p>
      </footer>
    </div>
  );
}
