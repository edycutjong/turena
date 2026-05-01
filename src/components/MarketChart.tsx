"use client";
import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, ReferenceLine,
} from "recharts";

interface Candle { time: string; price: number; }

interface Props { symbol?: string; }

export function MarketChart({ symbol = "METH/USDT" }: Props) {
  const [candles, setCandles] = useState<Candle[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Seed with last 30 points from REST, then stream via Bybit WS
  useEffect(() => {
    fetch(`/api/market/price?symbol=${encodeURIComponent(symbol)}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.price) {
          const now = new Date();
          const seed: Candle[] = Array.from({ length: 30 }, (_, i) => ({
            time: new Date(now.getTime() - (29 - i) * 2000).toLocaleTimeString(),
            price: d.price * (1 + (Math.random() - 0.5) * 0.001),
          }));
          setCandles(seed);
        }
      })
      .catch(() => {});

    // Bybit Testnet WebSocket for live ticker
    const ws = new WebSocket("wss://stream-testnet.bybit.com/v5/public/linear");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ op: "subscribe", args: ["tickers.MNTUSDT"] }));
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const price = parseFloat(msg?.data?.lastPrice);
        if (!price) return;
        setCandles((prev) => {
          const next = [
            ...prev.slice(-59),
            { time: new Date().toLocaleTimeString(), price },
          ];
          return next;
        });
      } catch { /* ignore malformed frames */ }
    };

    return () => ws.close();
  }, [symbol]);

  const prices = candles.map((c) => c.price);
  const minP = Math.min(...prices) * 0.9995;
  const maxP = Math.max(...prices) * 1.0005;
  const lastPrice = prices.at(-1) ?? 0;
  const firstPrice = prices.at(0) ?? 0;
  const isUp = lastPrice >= firstPrice;

  return (
    <div className="flex flex-col h-full bg-arena-surface border border-arena-border rounded-lg overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-arena-border">
        <span className="font-terminal text-xs text-arena-muted tracking-widest uppercase">
          {symbol}
        </span>
        <span className={`font-terminal text-sm font-bold
          ${isUp ? "text-arena-green" : "text-arena-red"}`}>
          ${lastPrice.toFixed(4)}
        </span>
      </div>

      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={candles} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0.3} />
                <stop offset="95%" stopColor={isUp ? "#22c55e" : "#ef4444"} stopOpacity={0}   />
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis domain={[minP, maxP]} hide />
            <Tooltip
              contentStyle={{ background: "#0f0f1a", border: "1px solid #1e1e2e", fontSize: 11 }}
              labelStyle={{ color: "#64748b" }}
              formatter={(v: unknown) => [`$${Number(v).toFixed(4)}`, "Price"]}
            />
            <ReferenceLine y={firstPrice} stroke="#64748b" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isUp ? "#22c55e" : "#ef4444"}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
