"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STORAGE_KEY = "turena_disclaimer_accepted";

export function DisclaimerModal() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if not already accepted in this browser
    if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="glass rounded-2xl border border-arena-border max-w-md w-full p-6 shadow-2xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-terminal text-xs text-arena-cyan uppercase tracking-widest mb-4">
              ⚠ Legal Notice
            </p>
            <h2 className="font-terminal text-xl font-bold text-arena-text mb-4">
              Before you enter the arena
            </h2>
            <p className="text-arena-muted text-sm leading-relaxed mb-4">
              Turena is a <strong className="text-arena-text">hackathon prototype</strong> deployed on
              Mantle Mainnet. Betting mechanics exist for the purpose of testing AI resilience and
              entertainment only.
            </p>
            <p className="text-arena-muted text-sm leading-relaxed mb-4">
              By continuing, you confirm:
            </p>
            <ul className="text-arena-muted text-sm space-y-1.5 mb-6 list-disc list-inside">
              <li>You are not located in the United States or United Kingdom</li>
              <li>You are 18 years of age or older</li>
              <li>You understand this is experimental software — bets may be lost</li>
              <li>You accept all financial risk associated with your participation</li>
            </ul>
            <p className="font-terminal text-xs text-arena-muted/60 mb-6">
              Void where prohibited. This is not financial advice.
            </p>
            <div className="flex gap-3">
              <button
                onClick={accept}
                className="flex-1 font-terminal text-sm font-bold text-arena-bg bg-arena-cyan rounded-lg py-3 hover:opacity-90 transition-opacity"
              >
                I Understand — Enter Arena
              </button>
              <a
                href="https://turena.edycu.dev"
                className="font-terminal text-xs text-arena-muted border border-arena-border rounded-lg py-3 px-4 flex items-center hover:border-arena-muted/60 transition-colors"
              >
                Exit
              </a>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
