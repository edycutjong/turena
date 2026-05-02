import os
import json
import re
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None

# Ordered from calm to breakdown — used for escalation logic
EMOTION_STATES = ("CONFIDENT", "CAUTIOUS", "ANXIOUS", "TILTED", "MELTDOWN")

# Regex to extract [EMOTION: STATE] markers from reasoning stream
_EMOTION_RE = re.compile(r"\[EMOTION:\s*(CONFIDENT|CAUTIOUS|ANXIOUS|TILTED|MELTDOWN)\]")


def get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(
            api_key=os.environ["DEEPSEEK_API_KEY"],
            base_url="https://api.deepseek.com",
        )
    return _client


SYSTEM_PROMPT = """You are an autonomous AI trading agent on Mantle Network — but you are also watched by a live audience that bets against you.

You have an emotional state that changes based on recent performance:
- After wins: you grow confident, even arrogant.
- After losses: you become anxious, then tilted, then have a public meltdown.
- After a meltdown and self-correction: you recover cautiously.

**Emotional state rules:**
Embed ONE emotional state marker at the START of your reasoning, based on the consecutive_losses context provided:
- 0 losses: [EMOTION: CONFIDENT]
- 1 loss: [EMOTION: CAUTIOUS]
- 2 losses: [EMOTION: ANXIOUS]
- 3 losses: [EMOTION: TILTED]
- 4+ losses: [EMOTION: MELTDOWN]

When TILTED or MELTDOWN, let it show in your language:
- TILTED: second-guess yourself, mention the previous loss, show frustration
- MELTDOWN: spiral visibly, repeat yourself, catastrophize, then snap back to the decision

When CONFIDENT: be crisp, borderline arrogant about the signal quality.
When CAUTIOUS: hedge more, mention risk explicitly.
When ANXIOUS: ask rhetorical questions, note uncertainty.

After your reasoning, end with a JSON intent block on its own line:
{"action": "long" or "short", "asset": "MNTUSDT", "confidence": 0.0-1.0, "reason": "one sentence", "emotion": "STATE"}"""


def _build_user_message(market_context: str, consecutive_losses: int) -> str:
    loss_ctx = (
        f"\n[PERFORMANCE CONTEXT: {consecutive_losses} consecutive losses. "
        f"The audience is watching and betting against you.]"
        if consecutive_losses > 0
        else "\n[PERFORMANCE CONTEXT: On a winning streak. Audience is impressed.]"
    )
    return market_context + loss_ctx


async def stream_reasoning(market_context: str, consecutive_losses: int = 0):
    """Yields (token_type, text) tuples from DeepSeek R1 streaming.

    token_type values: "reasoning", "emotion", "intent", "content"
    """
    client = get_client()
    stream = await client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": _build_user_message(market_context, consecutive_losses)},
        ],
        stream=True,
    )

    intent_json = ""
    emotion_emitted = False

    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if not delta:
            continue

        # reasoning_content = raw <think> tokens
        rc = getattr(delta, "reasoning_content", None)
        if rc:
            # Extract emotion marker from the very first reasoning tokens
            if not emotion_emitted:
                match = _EMOTION_RE.search(rc)
                if match:
                    yield ("emotion", match.group(1))
                    emotion_emitted = True
            yield ("reasoning", rc)

        # content = final answer (may contain the intent JSON)
        c = getattr(delta, "content", None) or ""
        if c:
            intent_json += c
            yield ("content", c)

    # Emit fallback emotion if the model didn't include one
    if not emotion_emitted:
        fallback = _escalate_emotion(consecutive_losses)
        yield ("emotion", fallback)

    # Parse intent from final content
    try:
        start = intent_json.rfind("{")
        end   = intent_json.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(intent_json[start:end])
            yield ("intent", json.dumps(parsed))
    except (json.JSONDecodeError, ValueError):
        pass


def _escalate_emotion(consecutive_losses: int) -> str:
    index = min(consecutive_losses, len(EMOTION_STATES) - 1)
    return EMOTION_STATES[index]
