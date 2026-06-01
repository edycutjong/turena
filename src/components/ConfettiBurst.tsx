"use client";
import { useEffect, useRef } from "react";

type BurstType = "win" | "loss";

interface Props {
  type: BurstType | null;
  onDone?: () => void;
}

const WIN_COLORS  = ["#00e5ff", "#00ff9d", "#ffd700", "#ffffff", "#7fff7f"];
const LOSS_COLORS = ["#ff2244", "#ff6600", "#882200", "#ff4400", "#ffaa00"];

export function ConfettiBurst({ type, onDone }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number>(0);

  useEffect(() => {
    if (!type) return;

    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = type === "win" ? WIN_COLORS : LOSS_COLORS;
    const count  = type === "win" ? 140 : 90;

    interface Particle {
      x: number; y: number;
      vx: number; vy: number;
      color: string;
      size: number;
      alpha: number;
      rot: number; rotV: number;
      shape: "rect" | "circle";
    }

    const particles: Particle[] = Array.from({ length: count }, () => {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 4 + Math.random() * 8;
      const cx = canvas.width / 2;
      const cy = canvas.height * 0.45;
      return {
        x: cx + (Math.random() - 0.5) * 60,
        y: cy + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (type === "win" ? 4 : 1),
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 6,
        alpha: 1,
        rot: Math.random() * Math.PI * 2,
        rotV: (Math.random() - 0.5) * 0.2,
        shape: Math.random() > 0.4 ? "rect" : "circle",
      };
    });

    const gravity = type === "win" ? 0.18 : 0.28;
    let frame = 0;

    function draw() {
      ctx!.clearRect(0, 0, canvas.width, canvas.height);
      let alive = 0;

      for (const p of particles) {
        p.vy  += gravity;
        p.x   += p.vx;
        p.y   += p.vy;
        p.rot += p.rotV;
        p.alpha -= 0.012;
        if (p.alpha <= 0) continue;
        alive++;

        ctx!.save();
        ctx!.globalAlpha = Math.max(0, p.alpha);
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;

        if (p.shape === "circle") {
          ctx!.beginPath();
          ctx!.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx!.fill();
        } else {
          ctx!.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
        ctx!.restore();
      }

      frame++;
      if (alive > 0 && frame < 220) {
        rafRef.current = requestAnimationFrame(draw);
      } else {
        ctx!.clearRect(0, 0, canvas.width, canvas.height);
        onDone?.();
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [type, onDone]);

  if (!type) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
