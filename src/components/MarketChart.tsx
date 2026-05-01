"use client";
import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";

interface Candle { time: string; price: number; }
interface Props { symbol?: string; }

export function MarketChart({ symbol = "MNTUSDT" }: Props) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const push = (price: number) =>
    setCandles((prev) => [
      ...prev.slice(-59),
      { time: new Date().toLocaleTimeString(), price },
    ]);

  useEffect(() => {
    // Initial fetch + seed history
    fetch(`/api/market/price?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.price) return;
        const now = Date.now();
        const seed: Candle[] = Array.from({ length: 30 }, (_, i) => ({
          time: new Date(now - (29 - i) * 10_000).toLocaleTimeString(),
          price: d.price * (1 + (Math.random() - 0.5) * 0.002),
        }));
        setCandles(seed);
      })
      .catch(() => {});

    // Poll CoinGecko every 10 s via backend proxy
    intervalRef.current = setInterval(() => {
      fetch(`/api/market/price?symbol=${encodeURIComponent(symbol)}`)
        .then((r) => r.json())
        .then((d) => { if (d.price) push(d.price); })
        .catch(() => {});
    }, 10_000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [symbol]);

  const prices = candles.map((c) => c.price);
  const minP = prices.length ? Math.min(...prices) * 0.9995 : 0;
  const maxP = prices.length ? Math.max(...prices) * 1.0005 : 1;
  const lastPrice = prices.at(-1) ?? 0;
  const firstPrice = prices.at(0) ?? 0;
  const isUp = lastPrice >= firstPrice;

  return (
    <div className="flex flex-col h-full bg-arena-surface border border-arena-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-arena-border">
        <span className="font-terminal text-xs text-arena-muted tracking-widest uppercase">
          MNT/USD
        </span>
        <div className="flex items-center gap-3">
          <span className={`font-terminal text-sm font-bold ${isUp ? "text-arena-green" : "text-arena-red"}`}>
            ${lastPrice.toFixed(4)}
          </span>
          <span className="font-terminal text-[10px] text-arena-muted border border-arena-border rounded px-1">
            CoinGecko
          </span>
        </div>
      </div>

      <div className="p-2" style={{ height: 160 }}>
        <ResponsiveContainer width="100%" height={160}>
          <AreaChart data={candles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[minP, maxP]} hide />
            <Tooltip
              contentStyle={{ background: "#0f0f1a", border: "1px solid #1e1e2e", fontSize: 11 }}
              labelStyle={{ color: "#64748b" }}
              formatter={(v: unknown) => [`$${Number(v).toFixed(4)}`, "MNT/USD"]}
            />
            <ReferenceLine y={firstPrice} stroke="#64748b" strokeDasharray="3 3" />
            <Area
              type="monotone" dataKey="price"
              stroke={isUp ? "#22c55e" : "#ef4444"} strokeWidth={2}
              fill="url(#priceGradient)" dot={false} isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
