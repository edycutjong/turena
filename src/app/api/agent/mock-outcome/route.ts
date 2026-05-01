import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  // Gate check: Only allow if DEMO_MODE is true
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ error: "Forbidden: Mock outcome endpoint is only available in DEMO_MODE" }, { status: 403 });
  }

  try {
    const { cycle_id, outcome } = await req.json();

    if (!cycle_id || !outcome) {
      return NextResponse.json({ error: "Missing cycle_id or outcome" }, { status: 400 });
    }

    if (outcome !== "loss" && outcome !== "win") {
      return NextResponse.json({ error: "Outcome must be 'win' or 'loss'" }, { status: 400 });
    }

    const pnl_mnt = outcome === "loss" ? -15 : 15;

    // Update trade cycle
    const { data: cycleData, error: cycleError } = await supabaseAdmin
      .from("trade_cycles")
      .update({
        result: outcome,
        pnl_mnt,
        self_corrected: outcome === "loss"
      })
      .eq("id", cycle_id)
      .select()
      .single();

    if (cycleError || !cycleData) {
      throw new Error(`Failed to update trade cycle: ${cycleError?.message || 'Not found'}`);
    }

    let correctionData = null;

    if (outcome === "loss") {
      // Create self-correction event
      // Simulate randomly changing a parameter like risk_tolerance or momentum_weight
      const paramsList = ["risk_tolerance", "momentum_weight", "latency_buffer_ms", "slippage_tolerance"];
      const changedParam = paramsList[Math.floor(Math.random() * paramsList.length)];
      
      const oldValue = Number((Math.random() * 0.9 + 0.1).toFixed(4));
      // Randomly adjust by up to 20%
      const adjustment = oldValue * (Math.random() * 0.4 - 0.2);
      const newValue = Number((oldValue + adjustment).toFixed(4));
      const regretScore = Number((Math.random() * 80 + 20).toFixed(1)); // 20 - 100

      const { data: insertedCorrection, error: correctionError } = await supabaseAdmin
        .from("self_corrections")
        .insert({
          cycle_id,
          parameter_changed: changedParam,
          old_value: oldValue,
          new_value: newValue,
          regret_score: regretScore,
          tx_hash: `0xmock${Math.random().toString(16).slice(2, 10)}`
        })
        .select()
        .single();

      if (correctionError) {
        throw new Error(`Failed to insert self-correction: ${correctionError.message}`);
      }
      correctionData = insertedCorrection;

      // Update agent state
      // First fetch the current state to append to the json
      const { data: agentData } = await supabaseAdmin
        .from("agent_state")
        .select("*")
        .eq("agent_id", cycleData.agent_id)
        .single();

      if (agentData) {
        const currentParams = (agentData.current_params as Record<string, unknown>) || {};
        const newParams = { ...currentParams, [changedParam]: newValue };

        await supabaseAdmin
          .from("agent_state")
          .update({
            current_params: newParams,
            self_corrections_count: agentData.self_corrections_count + 1,
            total_trades: agentData.total_trades + 1,
            total_pnl: agentData.total_pnl + pnl_mnt,
            win_rate: agentData.total_trades + 1 > 0 
              ? Number((((agentData.win_rate / 100) * agentData.total_trades) / (agentData.total_trades + 1) * 100).toFixed(2)) 
              : 0
          })
          .eq("agent_id", cycleData.agent_id);
      }
    }

    return NextResponse.json({ success: true, correction: correctionData });
  } catch (error: unknown) {
    console.error("Mock outcome error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
