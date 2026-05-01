import type { Metadata } from "next";
import { JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:3000"),
  title: "Turena — Watch AI Trade. Bet Against It.",
  description:
    "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window. Every decision recorded on Mantle.",
  openGraph: {
    title: "Turena — Watch AI Trade. Bet Against It.",
    description: "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window. Every decision recorded on Mantle.",
    siteName: "Turena",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Turena — Watch AI Trade. Bet Against It.",
    description: "Stream a live AI trading agent's Chain-of-Thought reasoning and counter-trade its decisions in a 15-second window.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${jetbrainsMono.variable} ${inter.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-arena-bg text-arena-text">
        {children}
      </body>
    </html>
  );
}
