#!/usr/bin/env bash
# Demo trigger — forces a loss + self-correction on the active cycle.
# Run this while screen-recording, just after the AI announces its intent.
#
# Usage: ./scripts/demo-trigger.sh [backend_url]
# Default backend_url: http://localhost:8000

set -e

BASE=${1:-http://localhost:8000}

echo "🔍  Fetching active cycle..."
CYCLE_ID=$(curl -sf "$BASE/agent/status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('active_cycle_id',''))")

if [ -z "$CYCLE_ID" ]; then
  echo "❌  No active cycle found. Start the backend with AUTO_CYCLE=true and wait for a cycle."
  exit 1
fi

echo "🎯  Active cycle: $CYCLE_ID"
echo "⏳  Waiting 3 seconds before forcing loss outcome..."
sleep 3

echo "💥  Triggering loss + self-correction..."
RESULT=$(curl -sf -X POST "$BASE/agent/mock-outcome" \
  -H "Content-Type: application/json" \
  -d "{\"cycle_id\": \"$CYCLE_ID\", \"outcome\": \"loss\"}")

echo "✅  Done:"
echo "$RESULT" | python3 -m json.tool
echo ""
echo "🔗  Mantle tx: $(echo "$RESULT" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tx_hash',''))")"
