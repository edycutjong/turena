import { describe, it, expect } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import proxy from "./proxy";

describe("proxy middleware", () => {
  it("allows non-restricted routes", () => {
    const req = new NextRequest("http://localhost:3000/");
    const res = proxy(req);
    // NextResponse.next() returns a response with header x-middleware-next
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("allows restricted route when country is not blocked", () => {
    const req = new NextRequest("http://localhost:3000/arena");
    (req as any).geo = { country: "FR" };
    const res = proxy(req);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects to /blocked when country is blocked", () => {
    const req = new NextRequest("http://localhost:3000/arena");
    (req as any).geo = { country: "US" };
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/blocked");
  });

  it("redirects to /blocked when country is GB", () => {
    const req = new NextRequest("http://localhost:3000/api/agent/trade-loop");
    (req as any).geo = { country: "GB" };
    const res = proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/blocked");
  });

  it("allows restricted route when country geo info is missing", () => {
    const req = new NextRequest("http://localhost:3000/arena");
    const res = proxy(req);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
