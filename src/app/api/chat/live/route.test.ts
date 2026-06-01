import { describe, it, expect, vi } from "vitest";
import { POST } from "./route";

describe("api/chat/live route", () => {
  it("generates message for COMMIT event type", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25); // index 1: Quant
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "COMMIT", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.persona).toBe("Quant");
    expect(data.message).toContain("Checking the commit hash");
    vi.restoreAllMocks();
  });

  it("generates message for COMMIT with Retail persona", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.75); // index 3: Retail
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "COMMIT", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.persona).toBe("Retail");
    expect(data.message).toContain("blindly betting");
    vi.restoreAllMocks();
  });

  it("generates message for COMMIT with other personas", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0); // index 0: Doomer
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "COMMIT", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("committed. Bets are open");
    vi.restoreAllMocks();
  });

  it("generates message for REVEAL event type (honest)", async () => {
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "REVEAL", agentName: "Agent-8004", details: { isHonest: true } })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("was honest");
  });

  it("generates message for REVEAL event type (dishonest)", async () => {
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "REVEAL", agentName: "Agent-8004", details: { isHonest: false } })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("lied about its intent");
  });

  it("generates message for SELF_CORRECTION event type with Permabull persona", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5); // index 2: Permabull
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "SELF_CORRECTION", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.persona).toBe("Permabull");
    expect(data.message).toContain("changed its mind mid-trade");
    vi.restoreAllMocks();
  });

  it("generates message for SELF_CORRECTION event type with Doomer persona", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.0); // index 0: Doomer
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "SELF_CORRECTION", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.persona).toBe("Doomer");
    expect(data.message).toContain("hesitating");
    vi.restoreAllMocks();
  });

  it("generates message for SELF_CORRECTION event type with other persona", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.25); // index 1: Quant
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "SELF_CORRECTION", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("Self-correction detected");
    vi.restoreAllMocks();
  });

  it("generates message for other event type", async () => {
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: JSON.stringify({ eventType: "OTHER", agentName: "Agent-8004" })
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.message).toContain("What's Agent-8004 doing now?");
  });

  it("handles errors gracefully", async () => {
    const req = new Request("http://localhost:3000/api/chat/live", {
      method: "POST",
      body: "invalid-json"
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Failed to generate chat");
  });
});
