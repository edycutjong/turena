import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config({ path: "../.env" });

const deployerKey = process.env.DEPLOYER_PRIVATE_KEY;

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun", viaIR: true },
  },
  networks: {
    mantleTestnet: {
      url: process.env.MANTLE_RPC_URL ?? "https://rpc.sepolia.mantle.xyz",
      chainId: 5003,
      accounts: deployerKey ? [deployerKey] : [],
    },
    mantleMainnet: {
      // Use MANTLE_MAINNET_RPC_URL for premium RPC (Alchemy/NodeReal) — public endpoint will
      // choke under 20 concurrent users during the live bounty stream.
      url: process.env.MANTLE_MAINNET_RPC_URL ?? "https://rpc.mantle.xyz",
      chainId: 5000,
      accounts: deployerKey ? [deployerKey] : [],
      gasMultiplier: 1.2,
    },
  },
  etherscan: {
    apiKey: {
      mantleTestnet: process.env.MANTLESCAN_API_KEY ?? "any",
      mantleMainnet: process.env.MANTLESCAN_API_KEY ?? "any",
    },
    customChains: [
      {
        network: "mantleTestnet",
        chainId: 5003,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=5003",
          browserURL: "https://sepolia.mantlescan.xyz",
        },
      },
      {
        network: "mantleMainnet",
        chainId: 5000,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=5000",
          browserURL: "https://mantlescan.xyz",
        },
      },
    ],
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
