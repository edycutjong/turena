import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Silence NEXT_PUBLIC_* warnings during build when env vars are not set (CI / Vercel preview)
  experimental: {
    serverActions: { allowedOrigins: ["*"] },
  },
  // Allow Recharts + viem to compile without errors on Vercel Edge
  serverExternalPackages: [],
};

export default nextConfig;
