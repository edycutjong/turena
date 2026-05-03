"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Turena] unhandled error:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-arena-bg flex items-center justify-center p-6">
      <div className="glass rounded-xl border border-red-500/30 max-w-md w-full p-6 text-center">
        <p className="font-terminal text-xs text-red-400 uppercase tracking-widest mb-4">
          System Error
        </p>
        <h1 className="font-terminal text-2xl font-bold text-arena-text mb-3">
          Something crashed
        </h1>
        <p className="text-arena-muted text-sm mb-2 leading-relaxed">
          {error.message || "An unexpected error occurred."}
        </p>
        {error.digest && (
          <p className="font-terminal text-xs text-arena-muted/50 mb-6">
            Ref: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="font-terminal text-sm font-bold text-arena-bg bg-arena-cyan rounded-lg px-6 py-3 hover:opacity-90 transition-opacity"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
