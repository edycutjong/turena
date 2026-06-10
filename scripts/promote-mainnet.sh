#!/usr/bin/env bash
# promote-mainnet.sh — flip README + env example from Mantle Sepolia (5003) to mainnet (5000).
#
# Run AFTER `make deploy-mainnet`, passing the 3 freshly deployed addresses:
#
#   scripts/promote-mainnet.sh <REGISTRY> <AGENT> <ESCROW>
#
# It rewrites README.md in place (chain name, IDs, RPC, explorer host, contract rows)
# and prints the env block to paste into Vercel + Railway. Re-runnable / idempotent.
set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "usage: $0 <PREDICTION_REGISTRY_ADDR> <TURING_AGENT_ADDR> <ESCROW_ADDR>" >&2
  exit 1
fi

REGISTRY="$1"; AGENT="$2"; ESCROW="$3"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
README="$ROOT/README.md"

# Old (Sepolia) addresses currently hard-coded in the README.
OLD_REGISTRY="0x20dF07fa678AD8A9fbBC188259Ea3895BF1e4C4D"
OLD_AGENT="0x70959f6BA18cadAe8050F8F487DBD5b442295725"
OLD_ESCROW="0xdfAb52e192a45ea00a33F76Ae8E582FbD6C25c46"

python3 - "$README" "$REGISTRY" "$AGENT" "$ESCROW" \
  "$OLD_REGISTRY" "$OLD_AGENT" "$OLD_ESCROW" <<'PY'
import sys, re
path, registry, agent, escrow, old_reg, old_agent, old_escrow = sys.argv[1:8]
s = open(path).read()

# Chain identity
s = s.replace("Mantle Sepolia Testnet (Chain ID: 5003)", "Mantle Mainnet (Chain ID: 5000)")
s = s.replace("Mantle Sepolia Testnet", "Mantle Mainnet")
s = s.replace("https://rpc.sepolia.mantle.xyz", "https://rpc.mantle.xyz")
s = s.replace("sepolia.mantlescan.xyz", "mantlescan.xyz")
s = s.replace("Chain-Mantle%20Sepolia", "Chain-Mantle%20Mainnet")
s = s.replace("[![Mantle Sepolia]", "[![Mantle Mainnet]")   # badge alt-text
s = s.replace("Mantle Sepolia RPC (default", "Mantle Mainnet RPC (default")
# Testnet faucet line is meaningless on mainnet — swap for a real-MNT note.
s = s.replace("- Testnet MNT from [faucet.sepolia.mantle.xyz](https://faucet.sepolia.mantle.xyz)",
              "- Real MNT in your wallet on Mantle Mainnet (bridge via [bridge.mantle.xyz](https://bridge.mantle.xyz))")
s = s.replace("Smart Contracts (Mantle Sepolia)", "Smart Contracts (Mantle Mainnet)")
s = s.replace("source-verified** on Mantle Sepolia (Chain ID `5003`)",
              "source-verified** on Mantle Mainnet (Chain ID `5000`)")
s = s.replace("running continuously on Mantle Sepolia", "running continuously on Mantle Mainnet")
s = s.replace("Continuous autonomous trading on Mantle Sepolia",
              "Continuous autonomous trading on Mantle Mainnet")
s = s.replace("Mantle Sepolia (5003)", "Mantle Mainnet (5000)")
s = s.replace("Add Mantle Sepolia", "Add Mantle Mainnet")
s = s.replace("Mantle Sepolia configured", "Mantle Mainnet configured")
s = s.replace("`Mantle Sepolia Testnet`", "`Mantle Mainnet`")
s = s.replace("Mantle Sepolia RPC (default: `https://rpc.mantle.xyz`)",
              "Mantle Mainnet RPC (default: `https://rpc.mantle.xyz`)")
# Sourcify match path uses chainId
s = s.replace("full_match/5003/", "full_match/5000/")
# Plain chain-id mentions in tables (do this last, after the 5003-in-URL cases above)
s = s.replace("Chain ID | `5003`", "Chain ID | `5000`")

# Contract addresses (registry/agent/escrow)
for old, new in ((old_reg, registry), (old_agent, agent), (old_escrow, escrow)):
    s = s.replace(old, new)

open(path, "w").write(s)
print("✅ README.md promoted to mainnet")
PY

cat <<EOF

────────────────────────────────────────────────────────
Paste these into Vercel (frontend) + Railway (backend) env
────────────────────────────────────────────────────────
NEXT_PUBLIC_MANTLE_CHAIN_ID=5000
PREDICTION_REGISTRY_ADDRESS=$REGISTRY
TURING_AGENT_ADDRESS=$AGENT
ESCROW_ADDRESS=$ESCROW
NEXT_PUBLIC_PREDICTION_REGISTRY_ADDRESS=$REGISTRY
NEXT_PUBLIC_TURING_AGENT_ADDRESS=$AGENT
NEXT_PUBLIC_ESCROW_ADDRESS=$ESCROW
# Also set MANTLE_MAINNET_RPC_URL to your premium RPC endpoint (backend).

Remaining manual steps:
  1. Verify on Mantlescan:
     cd contracts && npx hardhat verify --network mantleMainnet $AGENT
     (repeat for escrow; registry takes the agent address as a constructor arg:
      npx hardhat verify --network mantleMainnet $REGISTRY $AGENT)
  2. Redeploy frontend (Vercel) + backend (Railway) after env vars are set.
  3. Update the 3 example tx-hash links in README "Live On-Chain Proof" with new mainnet txs.
  4. git add -A && git commit -m "feat: promote to Mantle mainnet"
EOF
