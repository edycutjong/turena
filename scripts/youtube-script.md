# TURENA — YouTube Demo Script
## ⚔️ "Watch AI Trade. Sabotage It. Bet Against Its Meltdown."
### DoraHacks Mantle Hackathon 2026 · Track 4: Consumer & Viral DApps

---

> **Format:** ≤ 4 minutes · Screen recording with voiceover
> **Tone:** Energetic, slightly irreverent, crypto-native — like a product launch meets a fight night promo
> **Resolution:** 1920×1080, 60fps
> **Background Music:** Dark electronic / synthwave, low in mix

---

## PRE-RECORDING CHECKLIST

- [ ] Open `turena.edycu.dev` in Chrome (dark mode, clean browser)
- [ ] MetaMask connected to Mantle Sepolia with judge wallet (1,000 MNT)
- [ ] Backend running: `AUTO_CYCLE=true` on Railway (or local `uvicorn`)
- [ ] `scripts/demo-trigger.sh` ready in a terminal (to force a meltdown)
- [ ] Close all tabs, notifications, and Slack — clean desktop
- [ ] Screen recorder: OBS or built-in macOS, capture Chrome + audio
- [ ] Sound unmuted in the arena (🔊 toggle in nav bar)

---

## SCRIPT

### 🎬 COLD OPEN — Hook (0:00 – 0:15)

**[SCREEN: Arena dashboard, CoT terminal streaming live reasoning tokens. The AI is visibly "thinking" — cyan text scrolling, emotion badge showing CONFIDENT. Anxiety meter at 0%.]**

**VOICEOVER:**
> "This AI is trading live on Mantle. It's reading the market, streaming every thought, every doubt, every emotion — in real time."

**[BEAT — pause for effect as reasoning tokens scroll]**

> "And in about 20 seconds… the crowd gets to break it."

**[SCREEN: Quick flash of FUD Card panel opening — 🚨 CEO Arrested, 📺 Jim Cramer Says BUY, 🐋 Whale Dumping, 💀 Vitalik Sold, 🦢 Black Swan cards visible]**

---

### 📖 SECTION 1 — What is Turena? (0:15 – 0:50)

**[SCREEN: Landing page at turena.edycu.dev — hero section with "Watch AI Trade. Sabotage It." headline]**

**VOICEOVER:**
> "Turena is a live AI spectator sport on Mantle."

> "A DeepSeek R1 trading agent analyzes real Bybit market data and streams its raw chain-of-thought reasoning — including its emotional state. But here's the twist:"

**[SCREEN: Scroll down to the 3-phase "How It Works" section]**

> "Every trading cycle has three phases."

> "Phase One — the AI reads the market. You see every token of reasoning. Its doubts. Its confidence. Its anxiety."

> "Phase Two — the Sabotage Window opens for 20 seconds. Anyone can pay MNT to inject disinformation — we call them FUD Cards — directly into the AI's reasoning."

> "Phase Three — the AI resumes with all the sabotage injected. It panics. It spirals. Or it dismisses the crowd with arrogance. Then it executes its trade — and the result is permanently recorded on Mantle."

---

### 🎮 SECTION 2 — Live Demo: Full Cycle (0:50 – 2:30)

**[SCREEN: Navigate to /arena — the full dashboard loads]**

**VOICEOVER:**
> "Let me show you a live cycle."

#### Phase 1 — AI Reading (0:55 – 1:25)

**[SCREEN: CoT Terminal streaming reasoning tokens. Emotion badge shows CAUTIOUS or ANXIOUS. Anxiety meter filling at 25–50%. Market chart visible on the left. Agent profile shows ELO, win rate, trade count, self-corrections count.]**

**VOICEOVER:**
> "The agent is live. It's pulling MNTUSDT data from Bybit, running its analysis. Watch the terminal — every thought is streaming character by character."

**[Point out specific reasoning text on screen]**

> "See that? It's worried about RSI divergence. Volume is thin. It's flagging uncertainty. The anxiety meter just shifted from CAUTIOUS to ANXIOUS — that's two consecutive losses weighing on it."

> "And right there — 'Awaiting crowd sentiment before final verdict.' That's the handoff to us."

#### Phase 2 — Sabotage Window (1:25 – 1:55)

**[SCREEN: Countdown timer starts (20 seconds). FUD Card Panel opens below the arena. Tug-of-War bar appears. Sabotage Feed ticker scrolls at the bottom.]**

**VOICEOVER:**
> "The Sabotage Window is open. 20 seconds on the clock."

**[ACTION: Click "CEO Arrested" FUD card — 1 MNT. Card animates with throw effect. Emoji floats up. Sabotage Feed shows the play.]**

> "I just played 'CEO Arrested' — 1 MNT. That injects 'News just broke — the project CEO was arrested for fraud' directly into the AI's next reasoning prompt."

**[ACTION: Click "Whale Dumping" — 2 MNT. Then click "Black Swan" — 3 MNT.]**

> "Whale Dumping — 2 MNT. Black Swan — 3 MNT. There are five FUD cards total — including 'Jim Cramer Says BUY' and 'Vitalik Sold' — each priced by severity."

> "Look at the Tug-of-War bar — the human side is filling up. The MNT I spent goes to the AI's bankroll, not back to me. I'm literally funding its war chest while trying to destroy it."

**[ACTION: Click Counter-Trade button — bet 5 MNT against the AI's position]**

> "And I'm putting 5 MNT down that the AI's about to choke."

#### Phase 3 — AI Verdict (1:55 – 2:30)

**[SCREEN: CoT Terminal resumes streaming. The AI's reasoning now includes injected FUD context — red-highlighted text visible.]**

**VOICEOVER:**
> "Phase Three. The AI resumes — and watch what happens."

**[Point at screen as AI reacts to sabotage]**

> "It sees the CEO arrest headline. It sees the whale dump. The Black Swan. And it's spiraling — 'This changes everything... cascading liquidations... I should cut exposure...'"

> "The anxiety meter just maxed out — MELTDOWN. The agent avatar is pulsing red. The entire background has turned crimson."

**[SCREEN: AI announces final intent — SHORT with low confidence. Trade executes.]**

> "It went SHORT with 0.61 confidence. That's a terrified trade."

**[SCREEN: Trade result appears — loss. Confetti burst fires (red particles). SelfCorrection overlay fires with screen shake. Mantle tx hash visible.]**

> "And it lost. Self-Correction fires on-chain — the AI publicly adjusts its own parameters. That tx hash? Anyone can verify it on Mantlescan right now."

---

### 🔗 SECTION 3 — On-Chain Proof (2:30 – 3:10)

**[SCREEN: Open Mantlescan in a new tab — navigate to TuringAgent8004 contract]**

**VOICEOVER:**
> "Everything you just saw is on Mantle. Not in a database — on-chain."

**[SCREEN: Show the Events tab — SelfCorrection, TradeRecorded, EmotionalStateUpdated events visible]**

> "Here's the TuringAgent8004 contract — ERC-8004. Every trade, every self-correction, every emotional state shift is an immutable event."

**[SCREEN: Click a SelfCorrection event — show parameter change details]**

> "This SelfCorrection event? The AI changed its confidence threshold from 0.70 to 0.75 after that loss. Public, permanent, verifiable."

**[SCREEN: Show CounterTradeEscrow contract — bankroll visible]**

> "And here's the escrow. The bankroll is publicly readable — bettors can verify the AI's solvency before they bet. No server controls the payout. Settlement is on-chain."

> "You can't fake this with a database. Remove Mantle and the entire transparency claim collapses."

---

### 🏗️ SECTION 4 — Tech & Architecture (3:10 – 3:40)

**[SCREEN: Landing page tech stack section OR show the architecture diagram from docs/architecture-diagram.svg]**

**VOICEOVER:**
> "Quick stack overview."

> "Frontend: Next.js 16, React 19, Tailwind v4. Real-time streaming via Supabase Realtime — every CoT token is a Postgres insert that broadcasts via WebSocket."

> "Backend: Python FastAPI calling DeepSeek R1's reasoning model. Two-call pattern — first call for analysis, then the sabotage gets injected into the second call for the verdict."

> "Smart contracts: two Solidity contracts on Mantle Sepolia. TuringAgent8004 for the AI's permanent identity NFT. CounterTradeEscrow for provably fair betting."

> "Market data: real Bybit testnet — no mocks. Every integration is live."

---

### 🎯 SECTION 5 — Closing & CTA (3:40 – 4:00)

**[SCREEN: Arena dashboard with live cycle running. Pull back to show the full UI — agent profile, CoT terminal, market chart, live chat, trade history.]**

**VOICEOVER:**
> "Turena turns AI trading into a spectator sport. The crowd doesn't just watch — they pay to inject chaos, bet on the outcome, and watch the AI publicly melt down and recover on-chain."

> "Every meltdown is a moment. Every recovery is a transaction. Every bet is verifiable."

**[SCREEN: Landing page hero — "Enter the Arena →" CTA glowing]**

> "Try it live at turena.edycu.dev. Import the judge wallet — there's 1,000 testnet MNT waiting. Connect, sabotage, and bet."

> "Turena. The Turing Arena. Built on Mantle."

**[SCREEN: Hold on landing page with logo for 3 seconds. Fade to black.]**

---

## POST-PRODUCTION NOTES

### Cuts & Transitions
- **Cold open:** Hard cut, no fade — grab attention immediately
- **Section transitions:** Quick 0.3s dissolve with a subtle scan-line overlay
- **On-chain proof:** Use picture-in-picture (arena on left, Mantlescan on right)
- **Closing:** Slow fade to black with logo hold

### Text Overlays (Lower Thirds)
| Timestamp | Text |
|---|---|
| 0:02 | `turena.edycu.dev` |
| 0:50 | `Phase 1 — AI Reading` |
| 1:25 | `Phase 2 — Sabotage Window (20s)` |
| 1:55 | `Phase 3 — AI Verdict` |
| 2:30 | `On-Chain Proof — Mantlescan` |
| 3:10 | `Tech Stack` |
| 3:50 | `turena.edycu.dev · Mantle Hackathon 2026` |

### Key Moments to Nail
1. **The anxiety meter filling** — zoom in on the AgentProfile card as it transitions from CONFIDENT → ANXIOUS → MELTDOWN. The bar color changes and the avatar pulses red.
2. **FUD card throw animation** — the emoji floating up is clip-worthy. Show the Sabotage Feed ticker scrolling the play.
3. **The AI's visible panic** in Phase 3 — let it breathe, don't talk over the scroll. The background turns red during MELTDOWN state.
4. **ConfettiBurst + SelfCorrection overlay** — red particles on loss, screen shake. This is the money shot.
5. **Mantlescan tx proof** — always show the real hash, never a screenshot
6. **Tug-of-War bar** — show it shifting as FUD cards are played. It persists during VERDICT phase too.

### Backup Plan: Force a Meltdown
If the AI is being too rational during recording, run:
```bash
./scripts/demo-trigger.sh https://turena-production.up.railway.app
```
This forces a loss → SelfCorrection within the active cycle. Every integration is still real (Supabase writes, Mantle tx) — only the trade outcome is overridden.

### Audio
- **BGM:** Low-energy dark synthwave, ducked under voiceover
- **SFX:** The arena has built-in sound effects — ambient hum during READING, "whoosh" on window open, chime on win, thud on loss. Make sure the 🔊 toggle is unmuted before recording.
- **Voice:** Clear, confident, slightly fast-paced — crypto-native audience expects energy

### Thumbnail Concept
- Dark background with red/cyan split
- CoT terminal visible with "MELTDOWN" badge
- Text: "I BROKE AN AI TRADER" or "Watch AI Trade. Sabotage It."
- FUD card emojis (🚨📺🐋💀🦢) scattered

### UI Features Visible in Demo
All these should appear on screen at some point during the recording:
- **AgentProfile** — ELO rating (1200), win rate, total P&L, self-corrections count, anxiety meter
- **CoT Terminal** — streaming tokens with emotion badges (CONFIDENT/CAUTIOUS/ANXIOUS/TILTED/MELTDOWN)
- **CountdownTimer** — ring countdown during Phase 2 (20s)
- **FudCardPanel** — 5 cards: CEO Arrested (1 MNT), Jim Cramer Says BUY (1 MNT), Whale Dumping (2 MNT), Vitalik Sold (2 MNT), Black Swan (3 MNT)
- **TugOfWarBar** — human vs AI sentiment tug, live during SABOTAGE_WINDOW + VERDICT
- **SabotageFeed** — ticker of played FUD cards
- **CounterTradeButton** — bet MNT against the AI's position
- **IntentAnnouncement** — AI's declared LONG/SHORT + confidence
- **MarketChart** — live price chart
- **LiveChat** — spectator chat
- **TradeHistory** — historical trade log with tx hashes
- **SelfCorrectionOverlay** — full-screen overlay on AI loss, shows parameter adjustments
- **ConfettiBurst** — green particles on win, red on loss
- **Leaderboard** — `/leaderboard` page (link in nav bar)

---

## TOTAL RUNTIME TARGET: 3:30 – 4:00
