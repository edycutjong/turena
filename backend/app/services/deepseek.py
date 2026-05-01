import os
import json
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url="https://api.deepseek.com",
        )
    return _client


SYSTEM_PROMPT = """You are an autonomous AI trading agent on Mantle Network.
Analyze the market data provided and reason through a trading decision.
Think step by step about: market momentum, risk, position sizing, and confidence.
End your reasoning with a clear JSON intent block on its own line:
{"action": "long" or "short", "asset": "mETH", "confidence": 0.0-1.0, "reason": "one sentence"}"""


async def stream_reasoning(market_context: str):
    """Yields (token_type, text) tuples from DeepSeek R1 streaming."""
    client = get_client()
    stream = await client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": market_context},
        ],
        stream=True,
    )

    intent_json = ""
    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if not delta:
            continue

        # reasoning_content = raw <think> tokens
        rc = getattr(delta, "reasoning_content", None)
        if rc:
            yield ("reasoning", rc)

        # content = final answer (may contain the intent JSON)
        c = getattr(delta, "content", None) or ""
        if c:
            intent_json += c
            yield ("content", c)

    # Parse intent from final content
    try:
        start = intent_json.rfind("{")
        end   = intent_json.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(intent_json[start:end])
            yield ("intent", json.dumps(parsed))
    except (json.JSONDecodeError, ValueError):
        pass
