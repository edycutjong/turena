/**
 * Dedicated test for mainnet branch coverage in escrow.ts.
 *
 * The module-level ternaries (`_isMainnet ? ... : ...`) on lines 8, 14, 22
 * are evaluated at import time. The main escrow.test.ts always runs with
 * _chainId = 5003 (testnet default), so the `true` branches are never hit.
 *
 * This file sets NEXT_PUBLIC_MANTLE_CHAIN_ID = "5000" BEFORE importing,
 * which forces `_isMainnet = true` and exercises those branches.
 */
import { describe, it, expect, vi, beforeAll, afterAll } from "vitest";

// Set env BEFORE any import of escrow.ts
const ORIGINAL_ENV = process.env.NEXT_PUBLIC_MANTLE_CHAIN_ID;

beforeAll(() => {
  process.env.NEXT_PUBLIC_MANTLE_CHAIN_ID = "5000";
});

afterAll(() => {
  if (ORIGINAL_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_MANTLE_CHAIN_ID;
  } else {
    process.env.NEXT_PUBLIC_MANTLE_CHAIN_ID = ORIGINAL_ENV;
  }
});

// Mock viem so we don't need real network
vi.mock("viem", async (importOriginal) => {
  const actual = await importOriginal<typeof import("viem")>();
  return {
    ...actual,
    createPublicClient: vi.fn(),
    createWalletClient: vi.fn(),
    custom: vi.fn(),
    http: vi.fn(),
  };
});

describe("escrow.ts (mainnet branch coverage)", () => {
  it("uses mainnet chain name when MANTLE_CHAIN_ID = 5000", async () => {
    // Dynamic import so env is read fresh
    const { MANTLE_TESTNET } = await import("./escrow");
    expect(MANTLE_TESTNET.id).toBe(5000);
    expect(MANTLE_TESTNET.name).toBe("Mantle");
  });

  it("uses mainnet RPC URL when MANTLE_CHAIN_ID = 5000", async () => {
    const { MANTLE_TESTNET } = await import("./escrow");
    expect(MANTLE_TESTNET.rpcUrls.default.http[0]).toBe("https://rpc.mantle.xyz");
  });

  it("uses mainnet explorer when MANTLE_CHAIN_ID = 5000", async () => {
    const { MANTLE_EXPLORER } = await import("./escrow");
    expect(MANTLE_EXPLORER).toBe("https://explorer.mantle.xyz");
  });
});
