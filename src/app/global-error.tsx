"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Turena] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ background: "#0a0a0f", color: "#e2e8f0", fontFamily: "monospace", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0 }}>
        <div style={{ border: "1px solid rgba(239,68,68,0.3)", borderRadius: "12px", padding: "24px", maxWidth: "440px", textAlign: "center" }}>
          <p style={{ color: "#f87171", fontSize: "11px", letterSpacing: "0.2em", textTransform: "uppercase", marginBottom: "16px" }}>
            Fatal Error
          </p>
          <h1 style={{ fontSize: "20px", fontWeight: "bold", marginBottom: "12px" }}>
            Turena failed to load
          </h1>
          <p style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "20px" }}>
            {error.message || "An unexpected error occurred."}
          </p>
          <button
            onClick={reset}
            style={{ background: "#06b6d4", color: "#0a0a0f", border: "none", borderRadius: "8px", padding: "10px 24px", fontFamily: "monospace", fontWeight: "bold", cursor: "pointer" }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
