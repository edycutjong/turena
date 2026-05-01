import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Forbidden: Trade loop is only available in DEMO_MODE" }, { status: 403 });
  }

  try {
    const { agent_id = "agent-001" } = await req.json().catch(() => ({}));

    // Get current agent state to find cycle number
    let cycleNumber = 1;
    const { data: cycles } = await supabaseAdmin
      .from("trade_cycles")
      .select("cycle_number")
      .eq("agent_id", agent_id)
      .order("cycle_number", { ascending: false })
      .limit(1);

    if (cycles && cycles.length > 0) {
      cycleNumber = cycles[0].cycle_number + 1;
    }

    // Create the trade cycle
    const { data: newCycle, error: cycleError } = await supabaseAdmin
      .from("trade_cycles")
      .insert({
        agent_id,
        cycle_number: cycleNumber,
        intent: { pair: "BTC/USDT", direction: "long" },
        cot_transcript: "Analyzing market data...",
        result: "pending",
        self_corrected: false,
        pnl_mnt: null,
      })
      .select()
      .single();

    if (cycleError) {
      throw new Error(`Failed to create trade cycle: ${cycleError.message}`);
    }

    // Insert some mock CoT tokens to simulate the start of thinking
    await supabaseAdmin.from("cot_tokens").insert([
      { cycle_id: newCycle.id, token_text: "Analyzing ", token_type: "reasoning" },
      { cycle_id: newCycle.id, token_text: "market ", token_type: "reasoning" },
      { cycle_id: newCycle.id, token_text: "data...", token_type: "reasoning" }
    ]);

    return NextResponse.json({ success: true, cycle: newCycle });
  } catch (error: unknown) {
    console.error("Trade loop error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
