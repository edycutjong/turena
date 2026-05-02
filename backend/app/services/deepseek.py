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


INITIAL_ANALYSIS_PROMPT = """You are an autonomous AI trading agent being watched by a live audience.

Analyze the market data below. Think through momentum, risk, and signals.
Do NOT make a final decision yet — you will receive crowd sabotage input first.
End with: "Awaiting crowd sentiment before final verdict..." then stop.

Embed [EMOTION: STATE] at the start based on consecutive_losses context."""

VERDICT_PROMPT = """You previously analyzed the market and were about to make a decision.
Now you have received crowd sabotage input from the audience.

Your previous analysis summary:
{initial_analysis}

Crowd sabotage received:
{sabotage_context}

Now make your FINAL trading decision. React visibly to the sabotage — let it affect your reasoning.
If the sabotage is overwhelming, spiral. If it's weak, dismiss it with arrogance.

End your reasoning with a JSON intent block on its own line:
{{"action": "long" or "short", "asset": "MNTUSDT", "confidence": 0.0-1.0, "reason": "one sentence", "emotion": "STATE"}}"""


async def stream_initial_analysis(market_context: str, consecutive_losses: int = 0):
    """Phase 1: Stream initial market analysis without a final decision.

    Yields (token_type, text) — same as stream_reasoning but stops before intent.
    Returns the full analysis text for use in Phase 3.
    """
    client = get_client()
    full_text = ""
    emotion_emitted = False

    stream = await client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[
            {"role": "system", "content": INITIAL_ANALYSIS_PROMPT},
            {"role": "user",   "content": _build_user_message(market_context, consecutive_losses)},
        ],
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if not delta:
            continue

        rc = getattr(delta, "reasoning_content", None)
        if rc:
            if not emotion_emitted:
                match = _EMOTION_RE.search(rc)
                if match:
                    yield ("emotion", match.group(1))
                    emotion_emitted = True
            full_text += rc
            yield ("reasoning", rc)

        c = getattr(delta, "content", None) or ""
        if c:
            full_text += c
            yield ("content", c)

    if not emotion_emitted:
        yield ("emotion", _escalate_emotion(consecutive_losses))

    # Yield the full analysis back to the caller for use in verdict prompt
    yield ("analysis_complete", full_text)


async def stream_verdict(
    initial_analysis: str,
    sabotage_context: str,
    consecutive_losses: int = 0,
):
    """Phase 3: Stream final verdict with sabotage context injected.

    Yields (token_type, text) including "intent".
    """
    client = get_client()
    verdict_user = VERDICT_PROMPT.format(
        initial_analysis=initial_analysis[:2000],  # trim for token budget
        sabotage_context=sabotage_context or "No sabotage received. The crowd is silent.",
    )
    loss_suffix = _build_user_message("", consecutive_losses).replace("", "")

    intent_json = ""
    stream = await client.chat.completions.create(
        model="deepseek-reasoner",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": verdict_user + loss_suffix},
        ],
        stream=True,
    )

    async for chunk in stream:
        delta = chunk.choices[0].delta if chunk.choices else None
        if not delta:
            continue

        rc = getattr(delta, "reasoning_content", None)
        if rc:
            yield ("reasoning", rc)

        c = getattr(delta, "content", None) or ""
        if c:
            intent_json += c
            yield ("content", c)

    try:
        start = intent_json.rfind("{")
        end   = intent_json.rfind("}") + 1
        if start >= 0 and end > start:
            parsed = json.loads(intent_json[start:end])
            yield ("intent", json.dumps(parsed))
    except (json.JSONDecodeError, ValueError):
        pass
