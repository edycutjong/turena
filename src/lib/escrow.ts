import { createWalletClient, createPublicClient, custom, http, parseEther, type Address } from "viem";

const _chainId = Number(process.env.NEXT_PUBLIC_MANTLE_CHAIN_ID ?? "5003");
const _isMainnet = _chainId === 5000;

export const MANTLE_TESTNET = {
  id: _chainId,
  name: _isMainnet ? "Mantle" : "Mantle Sepolia Testnet",
  nativeCurrency: { name: "MNT", symbol: "MNT", decimals: 18 },
  rpcUrls: {
    default: {
      http: [
        process.env.NEXT_PUBLIC_MANTLE_RPC_URL ??
          (_isMainnet ? "https://rpc.mantle.xyz" : "https://rpc.sepolia.mantle.xyz"),
      ],
    },
  },
};

export const MANTLE_EXPLORER =
  process.env.NEXT_PUBLIC_MANTLE_EXPLORER ??
  (_isMainnet ? "https://explorer.mantle.xyz" : "https://explorer.sepolia.mantle.xyz");

export const ESCROW_ABI = [
  {
    name: "placeBet",
    type: "function",
    stateMutability: "payable",
    inputs: [
      { name: "cycleId", type: "uint256" },
      { name: "forAI",   type: "bool" },
    ],
    outputs: [],
  },
  {
    name: "claim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "cycleId", type: "uint256" }],
    outputs: [],
  },
  {
    name: "bankroll",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function getPublicClient() {
  return createPublicClient({
    chain: MANTLE_TESTNET,
    transport: http(),
  });
}

export async function placeBetTx(
  cycleNumber: number,
  amountMnt: number,
  contractAddress: Address,
): Promise<`0x${string}`> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }
  const walletClient = createWalletClient({
    chain: MANTLE_TESTNET,
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.requestAddresses();

  await walletClient.switchChain({ id: MANTLE_TESTNET.id }).catch(() => {
    return walletClient.addChain({ chain: MANTLE_TESTNET });
  });

  const hash = await walletClient.writeContract({
    address: contractAddress,
    abi: ESCROW_ABI,
    functionName: "placeBet",
    args: [BigInt(cycleNumber), false],
    value: parseEther(amountMnt.toString()),
    account,
  });

  return hash;
}

// Send MNT directly to the escrow's receive() — adds to AI bankroll, emits BankrollFunded.
// Used for FUD card payments: saboteur pays, AI's war chest grows, no payout to sender.
export async function sendSabotageTx(
  amountMnt: number,
  escrowAddress: Address,
): Promise<`0x${string}`> {
  if (typeof window === "undefined" || !window.ethereum) {
    throw new Error("MetaMask not found");
  }
  const walletClient = createWalletClient({
    chain: MANTLE_TESTNET,
    transport: custom(window.ethereum),
  });

  const [account] = await walletClient.requestAddresses();

  await walletClient.switchChain({ id: MANTLE_TESTNET.id }).catch(() => {
    return walletClient.addChain({ chain: MANTLE_TESTNET });
  });

  const hash = await walletClient.sendTransaction({
    to: escrowAddress,
    value: parseEther(amountMnt.toString()),
    account,
  });

  return hash;
}
