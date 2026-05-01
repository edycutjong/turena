import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "./route";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Mock the admin client
vi.mock("@/lib/supabase/admin", () => {
  return {
    supabaseAdmin: {
      from: vi.fn(),
    },
  };
});

const mockSupabaseAdmin = supabaseAdmin as any;

describe("POST /api/agent/mock-outcome", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    process.env = { ...originalEnv, DEMO_MODE: "true" };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  const createRequest = (body: any) => {
    return new Request("http://localhost:3000/api/agent/mock-outcome", {
      method: "POST",
      body: JSON.stringify(body),
    });
  };

  it("should return 403 if DEMO_MODE is not true", async () => {
    process.env.DEMO_MODE = "false";
    const req = createRequest({ cycle_id: "test", outcome: "loss" });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 400 if cycle_id or outcome is missing", async () => {
    const req = createRequest({ outcome: "loss" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if outcome is invalid", async () => {
    const req = createRequest({ cycle_id: "test", outcome: "draw" });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 500 if cycle update fails", async () => {
    mockSupabaseAdmin.from.mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ error: { message: "Update failed" }, data: null }),
    }));

    const req = createRequest({ cycle_id: "test", outcome: "win" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to update trade cycle: Update failed");
  });

  it("should successfully process a win outcome without correction", async () => {
    mockSupabaseAdmin.from.mockImplementation((table: string) => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ error: null, data: { id: "cycle-123", agent_id: "agent-1" } }),
    }));

    const req = createRequest({ cycle_id: "cycle-123", outcome: "win" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.correction).toBeNull();
  });

  it("should successfully process a loss outcome and create self correction", async () => {
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "cycle-123", agent_id: "agent-1" } }),
        };
      }
      if (table === "self_corrections") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "correction-1", parameter_changed: "risk_tolerance", new_value: 0.5 } }),
        };
      }
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            error: null,
            data: { agent_id: "agent-1", current_params: {}, self_corrections_count: 0, total_trades: 0, total_pnl: 0, win_rate: 0 }
          }),
          update: vi.fn().mockReturnThis(),
        };
      }
    });

    const req = createRequest({ cycle_id: "cycle-123", outcome: "loss" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.correction.id).toBe("correction-1");
  });

  it("should handle error during self-correction insert", async () => {
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "cycle-123", agent_id: "agent-1" } }),
        };
      }
      if (table === "self_corrections") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: { message: "Insert failed" }, data: null }),
        };
      }
    });

    const req = createRequest({ cycle_id: "cycle-123", outcome: "loss" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to insert self-correction: Insert failed");
  });

  it("should return 500 if cycle update returns no data", async () => {
    mockSupabaseAdmin.from.mockImplementation(() => ({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ error: null, data: null }),
    }));

    const req = createRequest({ cycle_id: "test", outcome: "win" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to update trade cycle: Not found");
  });

  it("should skip agent state update if agentData is null", async () => {
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "cycle-123", agent_id: "agent-1" } }),
        };
      }
      if (table === "self_corrections") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "correction-1", parameter_changed: "risk_tolerance", new_value: 0.5 } }),
        };
      }
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            error: null,
            data: null
          }),
        };
      }
    });

    const req = createRequest({ cycle_id: "cycle-123", outcome: "loss" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
  });

  it("should process loss outcome with negative total_trades for branch coverage", async () => {
    mockSupabaseAdmin.from.mockImplementation((table: string) => {
      if (table === "trade_cycles") {
        return {
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "cycle-123", agent_id: "agent-1" } }),
        };
      }
      if (table === "self_corrections") {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ error: null, data: { id: "correction-1", parameter_changed: "risk_tolerance", new_value: 0.5 } }),
        };
      }
      if (table === "agent_state") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            error: null,
            data: { agent_id: "agent-1", current_params: null, self_corrections_count: 0, total_trades: -1, total_pnl: 0, win_rate: 0 }
          }),
          update: vi.fn().mockReturnThis(),
        };
      }
    });

    const req = createRequest({ cycle_id: "cycle-123", outcome: "loss" });
    const res = await POST(req);
    expect(res.status).toBe(200);
  });

  it("should handle non-Error exceptions", async () => {
    mockSupabaseAdmin.from.mockImplementation(() => {
      throw "Some string error";
    });

    const req = createRequest({ cycle_id: "test", outcome: "win" });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Unknown error");
  });
});
