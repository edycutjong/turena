import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "TuringArena — Watch AI Trade. Bet Against It.",
  description: "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window. Every decision recorded on Mantle.",
  openGraph: {
    title: "TuringArena",
    description: "Watch AI trade. Bet against it. Everything on-chain.",
    type: "website",
  },
};

const STEPS = [
  {
    n: "01",
    title: "AI Thinks Out Loud",
    body: "Watch DeepSeek R1's raw reasoning tokens stream character-by-character as it analyzes live Bybit market data.",
    color: "text-arena-cyan",
    border: "border-arena-cyan/30",
  },
  {
    n: "02",
    title: "15-Second Counter Window",
    body: "The moment the AI announces its decision, a 15-second window opens. Bet against it with testnet MNT — or trust it.",
    color: "text-arena-red",
    border: "border-arena-red/30",
  },
  {
    n: "03",
    title: "Everything On-Chain",
    body: "Every trade, win, loss, and self-correction is permanently recorded on Mantle via ERC-8004. Verify on Explorer.",
    color: "text-arena-purple",
    border: "border-arena-purple/30",
  },
];

const STACK = [
  "DeepSeek R1", "Next.js 16", "Supabase Realtime",
  "Mantle Network", "ERC-8004", "Bybit Testnet",
];

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-4 border-b border-arena-border glass">
        <span className="font-terminal text-arena-cyan font-bold text-xl tracking-tight">
          TuringArena
        </span>
        <div className="flex items-center gap-6 font-terminal text-sm text-arena-muted">
          <a href="#how-it-works" className="hover:text-arena-text transition-colors">How it works</a>
          <Link
            href="/arena"
            className="px-4 py-1.5 rounded-lg border border-arena-cyan text-arena-cyan hover:bg-arena-cyan/10 transition-colors"
          >
            Enter Arena →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex flex-col items-center justify-center flex-1 text-center px-6 py-24 gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-arena-purple/40 bg-arena-purple/10">
          <span className="w-1.5 h-1.5 rounded-full bg-arena-green animate-pulse" />
          <span className="font-terminal text-xs text-arena-purple">Live on Mantle Testnet</span>
        </div>

        <h1 className="font-terminal text-5xl md:text-7xl font-bold leading-tight max-w-4xl">
          Watch AI Trade.{" "}
          <span className="text-arena-red">Bet Against It.</span>
        </h1>

        <p className="text-arena-muted text-lg max-w-xl leading-relaxed">
          A live AI trading agent streams its raw reasoning in real-time.
          You have <span className="text-arena-cyan font-semibold">15 seconds</span> to counter-trade
          its decision. Every outcome recorded on Mantle.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/arena"
            className="px-8 py-3 rounded-xl bg-arena-cyan text-arena-bg font-terminal font-bold text-sm tracking-wider hover:bg-cyan-400 transition-colors glow-cyan"
          >
            Enter the Arena
          </Link>
          <a
            href={`https://explorer.sepolia.mantle.xyz/address/${process.env.NEXT_PUBLIC_TURING_AGENT_ADDRESS ?? ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 rounded-xl border border-arena-border text-arena-muted font-terminal text-sm hover:border-arena-purple hover:text-arena-purple transition-colors"
          >
            View on Mantle Explorer ↗
          </a>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-6 py-20 max-w-5xl mx-auto w-full">
        <h2 className="font-terminal text-2xl font-bold text-center mb-12 text-arena-text">
          How it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div key={s.n} className={`glass rounded-xl p-6 border ${s.border} flex flex-col gap-3`}>
              <span className={`font-terminal text-3xl font-bold ${s.color}`}>{s.n}</span>
              <h3 className="font-terminal text-base font-bold text-arena-text">{s.title}</h3>
              <p className="text-arena-muted text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stack badges */}
      <section className="px-6 pb-16 flex flex-col items-center gap-4">
        <p className="font-terminal text-xs text-arena-muted tracking-widest uppercase">Built with</p>
        <div className="flex flex-wrap justify-center gap-2">
          {STACK.map((t) => (
            <span key={t} className="font-terminal text-xs px-3 py-1 rounded-full border border-arena-border text-arena-muted">
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-arena-border px-8 py-4 flex items-center justify-between">
        <span className="font-terminal text-xs text-arena-muted">
          TuringArena — DoraHacks Turing Test 2026
        </span>
        <a
          href="/arena"
          className="font-terminal text-xs text-arena-cyan hover:underline"
        >
          Enter Arena →
        </a>
      </footer>
    </main>
  );
}
