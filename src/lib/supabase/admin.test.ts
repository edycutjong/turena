import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "./admin";

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => "mock-from"),
  })),
}));

describe("supabaseAdmin", () => {
  beforeEach(() => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    // Reset the internal global _admin module state if possible, but since we cannot directly
    // reset module-level variables easily without resetting imports, we must be careful.
    // However, if we run tests in sequence, we can set env vars, trigger it, and check caching.
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("throws error when env vars are not set", () => {
    expect(() => supabaseAdmin.from).toThrow("Supabase admin env vars not set");
  });

  it("successfully creates client and routes calls when env vars are set", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://test-supabase-url");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key");

    const result = supabaseAdmin.from("test");
    expect(createClient).toHaveBeenCalledWith("http://test-supabase-url", "test-service-role-key");
    expect(result).toBe("mock-from");

    const result2 = supabaseAdmin.from("test-cached");
    expect(result2).toBe("mock-from");
    expect(createClient).toHaveBeenCalledTimes(1);
  });
});
