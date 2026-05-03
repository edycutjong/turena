"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { placeBetTx, MANTLE_EXPLORER } from "@/lib/escrow";
import type { Address } from "viem";

interface Props {
  isOpen: boolean;
  totalPool: number;
  againstPool: number;
  cycleNumber: number | null;
  walletAddress: Address | null;
  onConnect: () => void;
  onBetSuccess: (txHash: string) => void;
}

type BetState = "idle" | "confirm" | "pending" | "done" | "error";

const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "") as Address;

export function CounterTradeButton({
  isOpen,
  totalPool,
  againstPool,
  cycleNumber,
  walletAddress,
  onConnect,
  onBetSuccess,
}: Props) {
  const [betState, setBetState] = useState<BetState>("idle");
  const [amount, setAmount] = useState("1");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = () => {
    if (!walletAddress) { onConnect(); return; }
    if (!isOpen || !cycleNumber) return;
    setBetState("confirm");
  };

  const MIN_BET = 0.5;
  const MAX_BET = 2;

  const handleConfirm = async () => {
    if (!cycleNumber || !CONTRACT_ADDRESS) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < MIN_BET || amt > MAX_BET) {
      setErrorMsg(`Bet must be between ${MIN_BET} and ${MAX_BET} MNT`);
      setBetState("error");
      return;
    }
    setBetState("pending");
    try {
      const hash = await placeBetTx(cycleNumber, amt, CONTRACT_ADDRESS);
      setTxHash(hash);
      setBetState("done");
      onBetSuccess(hash);
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : "Transaction failed");
      setBetState("error");
    }
  };

  const reset = () => {
    setBetState("idle");
    setErrorMsg(null);
    setTxHash(null);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Main CTA */}
      <motion.button
        onClick={handleClick}
        disabled={betState === "pending" || betState === "done"}
        whileHover={isOpen ? { scale: 1.04 } : {}}
        whileTap={isOpen ? { scale: 0.97 } : {}}
        animate={isOpen && betState === "idle"
          ? { boxShadow: ["0 0 0px #ef4444", "0 0 22px #ef4444", "0 0 0px #ef4444"] }
          : { boxShadow: "none" }
        }
        transition={{ repeat: Infinity, duration: 1.4 }}
        className={`relative px-10 py-4 rounded-xl font-terminal font-bold text-lg
          tracking-widest uppercase transition-colors w-full
          ${isOpen && betState === "idle"
            ? "bg-arena-red text-white cursor-pointer hover:bg-red-600"
            : betState === "done"
            ? "bg-arena-green/20 text-arena-green border border-arena-green cursor-default"
            : "bg-arena-surface text-arena-muted border border-arena-border cursor-not-allowed"
          }`}
      >
        {!walletAddress ? "Connect Wallet" :
          betState === "done" ? "✓ Bet Placed" :
          betState === "pending" ? "Confirming…" :
          isOpen ? "⚡ Counter Trade" : "Waiting…"}
      </motion.button>

      {/* Pool display */}
      <div className="flex gap-6 font-terminal text-xs text-arena-muted">
        <span>Pool: <span className="text-arena-cyan">{totalPool.toFixed(2)} MNT</span></span>
        <span>Against AI: <span className="text-arena-red">{againstPool.toFixed(2)} MNT</span></span>
      </div>

      {/* Confirm dialog */}
      <AnimatePresence>
        {betState === "confirm" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-full glass rounded-xl p-4 flex flex-col gap-3 border border-arena-red/40"
          >
            <div className="flex items-center justify-between">
              <p className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Bet against AI</p>
              <p className="font-terminal text-[10px] text-arena-muted/60">{MIN_BET}–{MAX_BET} MNT</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={MIN_BET}
                max={MAX_BET}
                step="0.1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="flex-1 bg-arena-bg border border-arena-border rounded px-3 py-1.5
                  font-terminal text-sm text-arena-text outline-none focus:border-arena-red"
              />
              <span className="font-terminal text-xs text-arena-muted">MNT</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className="flex-1 py-2 rounded-lg bg-arena-red font-terminal text-xs text-white font-bold hover:bg-red-600 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={reset}
                className="flex-1 py-2 rounded-lg border border-arena-border font-terminal text-xs text-arena-muted hover:border-arena-muted transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {betState === "error" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full glass rounded-xl p-3 border border-arena-red/40"
          >
            <p className="font-terminal text-xs text-arena-red truncate">{errorMsg}</p>
            <button onClick={reset} className="font-terminal text-xs text-arena-muted hover:text-arena-text mt-1">
              Dismiss
            </button>
          </motion.div>
        )}

        {betState === "done" && txHash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="font-terminal text-xs text-center"
          >
            <a
              href={`${MANTLE_EXPLORER}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arena-cyan hover:underline"
            >
              {txHash.slice(0, 10)}… View on Explorer ↗
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
