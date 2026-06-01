import asyncio
import os
import random
from openai import AsyncOpenAI
from pydantic import BaseModel
from .db import get_pool

class ChatMessage(BaseModel):
    username: str
    message: str
    sentiment: str

class ChatResponse(BaseModel):
    messages: list[ChatMessage]

async def _generate_messages(cycle_id: str, phase: str, recent_cot: list[str], recent_sabotage: list[str]) -> list[ChatMessage]:
    client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", ""))
    if not client.api_key:
        return []

    system_prompt = """You are simulating a live Twitch/Crypto-Twitter style chat audience watching an AI trade live on Mantle.
Generate 1 to 3 short, punchy, degen chat messages reacting to the current state of the AI.
Use crypto slang (NGMI, WAGMI, rekt, liquidating, based, fud, pump it).
Current Phase: {phase}
Recent AI Thoughts:
{cot}
Recent Sabotage Events:
{sabotage}

Return a JSON array of objects with:
username: random generic crypto handle (e.g. DegenDoge, MantleWhale, ShortSeller99)
message: the chat message (keep it very short, 1-10 words)
sentiment: BULLISH, BEARISH, NEUTRAL, or TROLL
"""
    prompt = system_prompt.format(
        phase=phase,
        cot="\\n".join(recent_cot[-5:]) if recent_cot else "Thinking...",
        sabotage="\\n".join(recent_sabotage[-3:]) if recent_sabotage else "None"
    )

    try:
        response = await client.beta.chat.completions.parse(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format=ChatResponse,
            temperature=0.8,
        )
        return response.choices[0].message.parsed.messages
    except Exception as e:
        print(f"[spectator] Generation error: {e}")
        return []


async def run_spectator_loop():
    print("[spectator] Starting simulated audience loop...")
    while True:
        try:
            pool = await get_pool()
            
            # Find active cycle
            row = await pool.fetchrow("SELECT id, phase FROM trade_cycles WHERE phase != 'SETTLED' ORDER BY created_at DESC LIMIT 1")
            if not row:
                await asyncio.sleep(5)
                continue
                
            cycle_id = row['id']
            phase = row['phase']

            # Get recent context
            cot_rows = await pool.fetch("SELECT text FROM cot_tokens WHERE cycle_id = $1 ORDER BY created_at DESC LIMIT 5", cycle_id)
            recent_cot = [r['text'] for r in cot_rows]

            sab_rows = await pool.fetch("SELECT card_type FROM sabotage_events WHERE cycle_id = $1 ORDER BY created_at DESC LIMIT 3", cycle_id)
            recent_sabotage = [r['card_type'] for r in sab_rows]

            messages = await _generate_messages(cycle_id, phase, recent_cot, recent_sabotage)
            
            for msg in messages:
                # Insert
                await pool.execute(
                    "INSERT INTO spectator_chat (cycle_id, username, message, sentiment) VALUES ($1, $2, $3, $4)",
                    cycle_id, msg.username, msg.message, msg.sentiment
                )
                await asyncio.sleep(random.uniform(0.5, 1.5)) # staggered insert
                
            await asyncio.sleep(random.uniform(2.0, 4.0)) # Wait before next batch

        except Exception as e:
            print(f"[spectator] Loop error: {e}")
            await asyncio.sleep(5)
