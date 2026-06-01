import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => "mock-from"),
  })),
}));

describe("supabase browser client wrapper", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("throws error when env vars are not set", async () => {
    const { supabase } = await import("./supabase");
    expect(() => supabase.from).toThrow("Supabase env vars not set");
  });

  it("creates client and handles proxy routing when env vars are set", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://test-supabase-url");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon-key");

    const { supabase } = await import("./supabase");
    
    // Call property access first time (initializes _client)
    const result1 = supabase.from("table1");
    expect(createClient).toHaveBeenCalledWith("http://test-supabase-url", "test-anon-key");
    expect(result1).toBe("mock-from");

    // Call property access second time (returns cached client)
    const result2 = supabase.from("table2");
    expect(createClient).toHaveBeenCalledTimes(1); // should still be 1
    expect(result2).toBe("mock-from");
  });
});
