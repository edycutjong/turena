"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { placeBetTx, MANTLE_EXPLORER } from "@/lib/escrow";
import type { Address } from "viem";

interface Props {
  isOpen: boolean;
  deepSeekPool: number;
  openAIPool: number;
  cycleNumber: number | null;
  walletAddress: Address | null;
  onConnect: () => void;
  onBetSuccess: (txHash: string) => void;
}

type BetState = "idle" | "pick" | "confirm" | "pending" | "done" | "error";
type AgentChoice = 1 | 2; // 1 = DeepSeek, 2 = OpenAI

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_ESCROW_ADDRESS as Address;

export function CounterTradeButton({
  isOpen,
  deepSeekPool,
  openAIPool,
  cycleNumber,
  walletAddress,
  onConnect,
  onBetSuccess,
}: Props) {
  const [betState, setBetState] = useState<BetState>("idle");
  const [agentChoice, setAgentChoice] = useState<AgentChoice | null>(null);
  const [amount, setAmount] = useState("1");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleClick = () => {
    if (!walletAddress) { onConnect(); return; }
    if (!isOpen || !cycleNumber) return;
    setBetState("pick");
  };

  const selectAgent = (choice: AgentChoice) => {
    setAgentChoice(choice);
    setBetState("confirm");
  };

  const MIN_BET = 0.5;
  const MAX_BET = 50;

  const handleConfirm = async () => {
    if (!cycleNumber || !agentChoice) return;
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < MIN_BET || amt > MAX_BET) {
      setErrorMsg(`Bet must be between ${MIN_BET} and ${MAX_BET} MNT`);
      setBetState("error");
      return;
    }
    setBetState("pending");
    try {
      const hash = await placeBetTx(cycleNumber, agentChoice, amt, CONTRACT_ADDRESS);
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
    setAgentChoice(null);
    setErrorMsg(null);
    setTxHash(null);
  };

  return (
    <div className="flex flex-col items-center gap-3 w-full">
      {/* Main CTA */}
      <motion.button
        onClick={handleClick}
        disabled={betState === "pending" || betState === "done" || betState === "pick" || betState === "confirm" || betState === "error"}
        whileHover={isOpen && betState === "idle" ? { scale: 1.04 } : {}}
        whileTap={isOpen && betState === "idle" ? { scale: 0.97 } : {}}
        animate={isOpen && betState === "idle"
          ? { boxShadow: ["0 0 0px #06b6d4", "0 0 22px #06b6d4", "0 0 0px #06b6d4"] }
          : { boxShadow: "0px 0px 0px 0px rgba(0,0,0,0)" }
        }
        transition={{ repeat: Infinity, duration: 1.4 }}
        className={`relative px-10 py-4 rounded-xl font-terminal font-bold text-lg
          tracking-widest uppercase transition-colors w-full
          ${isOpen && betState === "idle"
            ? "bg-arena-cyan text-black cursor-pointer hover:bg-cyan-400"
            : betState === "done"
            ? "bg-arena-green/20 text-arena-green border border-arena-green cursor-default"
            : "bg-arena-surface text-arena-muted border border-arena-border cursor-not-allowed"
          }
          ${betState !== "idle" && betState !== "done" ? "hidden" : "block"}
          `}
      >
        {!walletAddress ? "Connect Wallet" :
          betState === "done" ? "✓ Bet Placed" :
          isOpen ? "⚡ Place Bet" : "Waiting…"}
      </motion.button>

      {/* Pool display */}
      {betState === "idle" && (
        <div className="flex gap-4 font-terminal text-xs text-arena-muted w-full justify-between px-2 mt-2">
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase">DeepSeek</span>
            <span className="text-arena-cyan">{deepSeekPool.toFixed(1)} MNT</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-[10px] uppercase">OpenAI</span>
            <span className="text-arena-purple">{openAIPool.toFixed(1)} MNT</span>
          </div>
        </div>
      )}

      {/* Pick dialog */}
      <AnimatePresence>
        {betState === "pick" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-full glass rounded-xl p-4 flex flex-col gap-3 border border-arena-cyan/40"
          >
            <p className="font-terminal text-xs text-center text-arena-text uppercase tracking-widest">Who Wins This Cycle?</p>
            <div className="flex gap-2">
              <button
                onClick={() => selectAgent(1)}
                className="flex-1 py-3 rounded-lg border border-arena-cyan/50 hover:bg-arena-cyan hover:text-black font-terminal text-xs text-arena-cyan transition-colors"
              >
                DeepSeek
              </button>
              <button
                onClick={() => selectAgent(2)}
                className="flex-1 py-3 rounded-lg border border-arena-purple/50 hover:bg-arena-purple hover:text-white font-terminal text-xs text-arena-purple transition-colors"
              >
                OpenAI
              </button>
            </div>
            <button
              onClick={reset}
              className="mt-1 font-terminal text-xs text-arena-muted hover:text-arena-text transition-colors"
            >
              Cancel
            </button>
          </motion.div>
        )}

        {/* Confirm dialog */}
        {betState === "confirm" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className={`w-full glass rounded-xl p-4 flex flex-col gap-3 border ${agentChoice === 1 ? 'border-arena-cyan/40' : 'border-arena-purple/40'}`}
          >
            <div className="flex items-center justify-between">
              <p className={`font-terminal text-xs uppercase tracking-widest ${agentChoice === 1 ? 'text-arena-cyan' : 'text-arena-purple'}`}>
                Bet on {agentChoice === 1 ? 'DeepSeek' : 'OpenAI'}
              </p>
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
                className={`flex-1 bg-arena-bg border border-arena-border rounded px-3 py-1.5
                  font-terminal text-sm text-arena-text outline-none ${agentChoice === 1 ? 'focus:border-arena-cyan' : 'focus:border-arena-purple'}`}
              />
              <span className="font-terminal text-xs text-arena-muted">MNT</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2 rounded-lg font-terminal text-xs text-black font-bold transition-colors ${agentChoice === 1 ? 'bg-arena-cyan hover:bg-cyan-400' : 'bg-arena-purple text-white hover:bg-purple-400'}`}
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

        {betState === "pending" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="w-full glass rounded-xl p-4 flex flex-col items-center justify-center gap-2 border border-arena-border"
          >
            <div className="w-5 h-5 rounded-full border-2 border-arena-cyan/30 border-t-arena-cyan animate-spin"></div>
            <p className="font-terminal text-xs text-arena-muted uppercase tracking-widest">Confirming in Wallet...</p>
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
            className="font-terminal text-xs text-center mt-2"
          >
            <a
              href={`${MANTLE_EXPLORER}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-arena-green hover:underline"
            >
              {txHash.slice(0, 10)}… View on Explorer ↗
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
