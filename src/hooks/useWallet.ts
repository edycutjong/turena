"use client";
import { useState, useCallback, useEffect } from "react";
import { createWalletClient, custom, type Address } from "viem";
import { MANTLE_TESTNET } from "@/lib/escrow";

interface WalletState {
  address: Address | null;
  connected: boolean;
  connecting: boolean;
}

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, cb: (args: unknown) => void) => void;
      removeListener: (event: string, cb: (args: unknown) => void) => void;
    };
  }
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    address: null,
    connected: false,
    connecting: false,
  });

  // Restore previously connected account on load
  useEffect(() => {
    if (typeof window === "undefined" || !window.ethereum) return;
    window.ethereum
      .request({ method: "eth_accounts" })
      .then((accounts) => {
        const list = accounts as Address[];
        if (list.length > 0) {
          setState({ address: list[0], connected: true, connecting: false });
        }
      })
      .catch(() => {});

    const handleChange = (accounts: unknown) => {
      const list = accounts as Address[];
      setState({ address: list[0] ?? null, connected: list.length > 0, connecting: false });
    };
    window.ethereum.on("accountsChanged", handleChange);
    return () => window.ethereum?.removeListener("accountsChanged", handleChange);
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert("MetaMask not detected. Install it from metamask.io");
      return;
    }
    setState((s) => ({ ...s, connecting: true }));
    try {
      const walletClient = createWalletClient({
        chain: MANTLE_TESTNET,
        transport: custom(window.ethereum),
      });
      const [account] = await walletClient.requestAddresses();
      setState({ address: account, connected: true, connecting: false });
    } catch {
      setState((s) => ({ ...s, connecting: false }));
    }
  }, []);

  const disconnect = useCallback(() => {
    setState({ address: null, connected: false, connecting: false });
  }, []);

  return { ...state, connect, disconnect };
}
