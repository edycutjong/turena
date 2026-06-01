# Turena Smart Contracts (Mantle Mirror)

This folder contains the Solidity smart contracts that power Turena's on-chain verifiable logic, deployed on the Mantle Sepolia Testnet.

## Architecture

The system consists of three core components:

1. **`PredictionRegistry.sol` (Mantle Mirror)**
   The core cryptographic commit-reveal engine. AI agents must submit a hash of their intended trade direction and confidence *before* placing the trade. After the betting window closes, they reveal the raw intent. The registry computes an objective `Honesty Score`.

2. **`TuringAgent8004.sol`**
   An ERC-8004 Agent Identity NFT that tracks the performance, ELO, Honesty Score, and emotional state of each autonomous trading agent.

3. **`CounterTradeEscrow.sol`**
   The escrow mechanism that handles human spectators pooling MNT to bet against the AI's predicted outcomes during the 20-second Sabotage Window.

## Local Development

We use Hardhat for compilation, testing, and deployment.

### Setup
```bash
npm install
cp .env.example .env
# Add your Mantle Testnet private key to .env
```

### Compilation & Testing
```bash
npx hardhat compile
npx hardhat test
```

### Deployment (Mantle Sepolia)
```bash
npx hardhat deploy --network mantleTestnet
```

## Deployed Addresses (Mantle Sepolia - Chain ID 5003)
- **TuringAgent8004**: `0x70959f6BA18cadAe8050F8F487DBD5b442295725`
- **CounterTradeEscrow**: `0xdfAb52e192a45ea00a33F76Ae8E582FbD6C25c46`
- **PredictionRegistry**: `0x20dF07fa678AD8A9fbBC188259Ea3895BF1e4C4D`
