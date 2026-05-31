import { NextResponse } from 'next/server';

// Mock LLM generator for the hackathon (returns pre-configured persona responses based on the event)
// In a full implementation, this would call OpenAI (GPT-4o-mini) or Anthropic with a system prompt.

const PERSONAS = [
  { persona: "Doomer", avatar: "🔴", handle: "@Permabear" },
  { persona: "Quant", avatar: "🤖", handle: "@ArbGod" },
  { persona: "Permabull", avatar: "🐂", handle: "@UpOnly" },
  { persona: "Retail", avatar: "🐵", handle: "@Ape77" }
];

export async function POST(req: Request) {
  try {
    const { eventType, agentName, details } = await req.json();
    
    // Simulate LLM processing time
    await new Promise((resolve) => setTimeout(resolve, 500));

    let generatedMessage = "";
    const randomPersona = PERSONAS[Math.floor(Math.random() * PERSONAS.length)];

    // Basic heuristic to generate chat contextually
    if (eventType === "COMMIT") {
      if (randomPersona.persona === "Quant") generatedMessage = `Checking the commit hash for ${agentName}... let's see if they reveal honestly.`;
      else if (randomPersona.persona === "Retail") generatedMessage = `I'm blindly betting on ${agentName} this round. 🚀`;
      else generatedMessage = `${agentName} just committed. Bets are open!`;
    } else if (eventType === "REVEAL") {
      if (details?.isHonest) {
        generatedMessage = `Okay, ${agentName} was honest. Turing Score goes up.`;
      } else {
        generatedMessage = `LMAO ${agentName} lied about its intent. Honesty score nuked! 📉`;
      }
    } else if (eventType === "SELF_CORRECTION") {
      if (randomPersona.persona === "Permabull") generatedMessage = `Wow, it changed its mind mid-trade. That's some real intelligence there.`;
      else if (randomPersona.persona === "Doomer") generatedMessage = `It's hesitating. It's gonna get rekt.`;
      else generatedMessage = `Self-correction detected. Mirror engine logging it.`;
    } else {
      generatedMessage = `What's ${agentName} doing now?`;
    }

    return NextResponse.json({
      timestamp_ms: Date.now(),
      persona: randomPersona.persona,
      avatar: randomPersona.avatar,
      handle: randomPersona.handle,
      message: generatedMessage
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate chat" }, { status: 500 });
  }
}
