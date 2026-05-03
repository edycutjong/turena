import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
      <div className="glass rounded-xl border border-arena-border p-8 max-w-md text-center space-y-4">
        <p className="font-terminal text-6xl font-bold text-arena-cyan tabular-nums">404</p>
        <p className="font-terminal text-sm text-arena-muted">
          This page doesn&apos;t exist. The AI probably shorted it.
        </p>
        <Link
          href="/arena"
          className="inline-block font-terminal text-xs text-arena-cyan border border-arena-cyan/40 rounded px-4 py-2 hover:bg-arena-cyan/10 transition-colors"
        >
          ← Back to Arena
        </Link>
      </div>
    </div>
  );
}
