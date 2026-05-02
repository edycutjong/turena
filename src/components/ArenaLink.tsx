"use client";

import { useRouter } from "next/navigation";
import { useCallback, type ReactNode, type MouseEvent } from "react";

interface ArenaLinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export function ArenaLink({ href, className = "", children }: ArenaLinkProps) {
  const router = useRouter();

  const handleClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      e.preventDefault();

      // Inject transition overlay
      const overlay = document.createElement("div");
      overlay.className = "arena-transition-overlay";
      document.body.appendChild(overlay);

      // Navigate after wipe animation completes (~300ms)
      setTimeout(() => {
        router.push(href);
        // Clean up overlay after navigation settles
        setTimeout(() => overlay.remove(), 400);
      }, 280);
    },
    [href, router]
  );

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
