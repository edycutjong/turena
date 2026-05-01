import Link from "next/link";
import type { ReactNode } from "react";

interface Props {
  right?: ReactNode;
  sub?: ReactNode;
}

export function AppNav({ right, sub }: Props) {
  return (
    <nav className="h-14 flex items-center justify-between px-6 border-b border-arena-border glass sticky top-0 z-20 shrink-0">
      <div className="flex items-center gap-2.5">
        <Link href="/" className="font-terminal text-arena-cyan font-bold text-lg tracking-tight leading-none">
          Turena
        </Link>
        <span className="font-terminal text-xs text-arena-muted/60 tracking-widest hidden sm:inline leading-none">
          The Turing Arena
        </span>
        {sub && (
          <span className="font-terminal text-xs text-arena-muted leading-none">
            {sub}
          </span>
        )}
      </div>
      {right && (
        <div className="flex items-center gap-4 font-terminal text-xs text-arena-muted">
          {right}
        </div>
      )}
    </nav>
  );
}
