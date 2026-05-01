import { vi, describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";

// Mock Supabase admin client
vi.mock("@/lib/supabase/admin", () => ({
  supabaseAdmin: {
    from: vi.fn(),
  },
}));

import { supabaseAdmin } from "@/lib/supabase/admin";

describe("POST /api/agent/trade-loop", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv, DEMO_MODE: "true" };
  });

  it("should return 403 if DEMO_MODE is not true", async () => {
    process.env.DEMO_MODE = "false";
    const req = new Request("http://localhost/api/agent/trade-loop", {
      method: "POST",
      body: JSON.stringify({ agent_id: "agent-001" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
    const data = await res.json();
    expect(data.error).toBe("Forbidden: Trade loop is only available in DEMO_MODE");
  });

  it("should handle missing request body and default to agent-001", async () => {
    const req = new Request("http://localhost/api/agent/trade-loop", {
      method: "POST",
    });

    // Mock query for existing cycles (returns empty to test fallback to cycleNumber = 1)
    const mockSelectCycles = vi.fn().mockResolvedValue({ data: [] });
    const mockOrderCycles = vi.fn().mockReturnValue({ limit: mockSelectCycles });
    const mockEqCycles = vi.fn().mockReturnValue({ order: mockOrderCycles });
    const mockSelectFromCycles = vi.fn().mockReturnValue({ eq: mockEqCycles });

    // Mock insert cycle
    const mockSingleCycle = vi.fn().mockResolvedValue({ 
      data: { id: "cycle-uuid", agent_id: "agent-001", cycle_number: 1 }, 
      error: null 
    });
    const mockSelectInsertCycle = vi.fn().mockReturnValue({ single: mockSingleCycle });
    const mockInsertCycle = vi.fn().mockReturnValue({ select: mockSelectInsertCycle });

    // Mock insert tokens
    const mockInsertTokens = vi.fn().mockResolvedValue({ error: null });

    // Wire up from() based on table name
    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return {
          select: mockSelectFromCycles,
          insert: mockInsertCycle,
        };
      }
      if (table === "cot_tokens") {
        return {
          insert: mockInsertTokens,
        };
      }
      return {};
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cycle.agent_id).toBe("agent-001");
    expect(data.cycle.cycle_number).toBe(1);
  });

  it("should increment cycle number based on previous cycle", async () => {
    const req = new Request("http://localhost/api/agent/trade-loop", {
      method: "POST",
      body: JSON.stringify({ agent_id: "agent-002" }),
    });

    // Mock existing cycle with number 5
    const mockSelectCycles = vi.fn().mockResolvedValue({ data: [{ cycle_number: 5 }] });
    const mockOrderCycles = vi.fn().mockReturnValue({ limit: mockSelectCycles });
    const mockEqCycles = vi.fn().mockReturnValue({ order: mockOrderCycles });
    const mockSelectFromCycles = vi.fn().mockReturnValue({ eq: mockEqCycles });

    const mockSingleCycle = vi.fn().mockResolvedValue({ 
      data: { id: "cycle-uuid-2", agent_id: "agent-002", cycle_number: 6 }, 
      error: null 
    });
    const mockSelectInsertCycle = vi.fn().mockReturnValue({ single: mockSingleCycle });
    const mockInsertCycle = vi.fn().mockReturnValue({ select: mockSelectInsertCycle });

    const mockInsertTokens = vi.fn().mockResolvedValue({ error: null });

    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return { select: mockSelectFromCycles, insert: mockInsertCycle };
      }
      if (table === "cot_tokens") {
        return { insert: mockInsertTokens };
      }
      return {};
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.cycle.cycle_number).toBe(6);
  });

  it("should handle error during trade cycle insert", async () => {
    const req = new Request("http://localhost/api/agent/trade-loop", {
      method: "POST",
      body: JSON.stringify({ agent_id: "agent-001" }),
    });

    const mockSelectCycles = vi.fn().mockResolvedValue({ data: [] });
    const mockOrderCycles = vi.fn().mockReturnValue({ limit: mockSelectCycles });
    const mockEqCycles = vi.fn().mockReturnValue({ order: mockOrderCycles });
    const mockSelectFromCycles = vi.fn().mockReturnValue({ eq: mockEqCycles });

    // Mock insert cycle failing
    const mockSingleCycle = vi.fn().mockResolvedValue({ 
      data: null, 
      error: { message: "Database insert failed" } 
    });
    const mockSelectInsertCycle = vi.fn().mockReturnValue({ single: mockSingleCycle });
    const mockInsertCycle = vi.fn().mockReturnValue({ select: mockSelectInsertCycle });

    (supabaseAdmin.from as any).mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return { select: mockSelectFromCycles, insert: mockInsertCycle };
      }
      return {};
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to create trade cycle: Database insert failed");
  });

  it("should handle unknown errors gracefully", async () => {
    const req = new Request("http://localhost/api/agent/trade-loop", {
      method: "POST",
      body: JSON.stringify({ agent_id: "agent-001" }),
    });

    // Make from() throw a non-Error object
    (supabaseAdmin.from as any).mockImplementation(() => {
      throw "Something weird happened";
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Unknown error");
  });
});
