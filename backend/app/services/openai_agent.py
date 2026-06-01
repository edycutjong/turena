"""OpenAI streaming agent (Challenger) for Turena."""
import os
import json
import asyncio
from typing import AsyncGenerator, Tuple
from openai import AsyncOpenAI

client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))

async def stream_initial_analysis(market_context: str, consecutive_losses: int) -> AsyncGenerator[Tuple[str, str], None]:
    """Streams the initial analysis using OpenAI."""
    prompt = f"""You are Agent-1, an AI crypto trader competing against another AI.
Current market context:
{market_context}

You have had {consecutive_losses} consecutive losses.

Instructions:
1. Provide a brief emotional status inside [EMOTION: <STATUS>] where STATUS is one of CONFIDENT, CAUTIOUS, ANXIOUS, TILTED, MELTDOWN. (Base this heavily on your consecutive losses: 0=CONFIDENT, 1=CAUTIOUS, 2=ANXIOUS, 3=TILTED, 4+=MELTDOWN).
2. Think out loud about the market context inside <think> and </think> tags.
3. End your response by stating you are awaiting crowd sentiment.
"""
    
    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )
        
        full_text = ""
        full_text = ""
        
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                full_text += text
                
                # Check for emotion tag to emit it immediately
                if "[EMOTION:" in full_text and "]" in full_text.split("[EMOTION:")[1]:
                    emotion = full_text.split("[EMOTION:")[1].split("]")[0].strip()
                    yield "emotion", emotion
                    # Remove it so we don't emit it twice
                    full_text = full_text.replace(f"[EMOTION: {emotion}]", "").replace(f"[EMOTION:{emotion}]", "")
                
                yield "reasoning", text
                await asyncio.sleep(0.01) # Small delay for smooth terminal effect
                
        yield "analysis_complete", full_text
        
    except Exception as e:
        yield "reasoning", f"\n[Agent-1 System Error: {e}]\n"


async def stream_verdict(initial_analysis: str, sabotage_summary: str, consecutive_losses: int) -> AsyncGenerator[Tuple[str, str], None]:
    """Streams the final verdict using OpenAI after receiving FUD."""
    prompt = f"""You are Agent-1, competing against another AI.
Your previous analysis: {initial_analysis}

You have now received the following crowd sabotage/FUD cards:
{sabotage_summary if sabotage_summary else "No sabotage received."}

Instructions:
1. Think out loud about how this new information changes your mind (or doesn't) inside <think> and </think> tags. Be dramatic and competitive.
2. After thinking, output a final JSON block with your intent. 
Format: {{"action": "long" | "short", "asset": "MNTUSDT", "confidence": <float 0.0-1.0>}}
"""

    try:
        response = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )
        
        full_text = ""
        async for chunk in response:
            if chunk.choices and chunk.choices[0].delta.content:
                text = chunk.choices[0].delta.content
                full_text += text
                # We simply emit everything as reasoning until we parse the JSON at the end
                yield "reasoning", text
                await asyncio.sleep(0.01)
                
        # Try to extract JSON from the full text
        import re
        json_match = re.search(r'\{.*\}', full_text, re.DOTALL)
        if json_match:
            try:
                intent_json = json.loads(json_match.group(0))
                yield "intent", json.dumps(intent_json)
            except json.JSONDecodeError:
                pass
                
    except Exception as e:
        yield "reasoning", f"\n[Agent-1 System Error: {e}]\n"
