import { NextRequest, NextResponse } from "next/server";

const BLOCKED_COUNTRIES = ["US", "GB"];

export default function proxy(req: NextRequest) {
  // Only block the arena and API betting routes — landing page stays accessible
  const { pathname } = req.nextUrl;
  const isRestricted = pathname.startsWith("/arena");

  if (!isRestricted) return NextResponse.next();

  const country = (req as unknown as { geo?: { country?: string } }).geo?.country ?? "";
  if (BLOCKED_COUNTRIES.includes(country)) {
    return NextResponse.redirect(new URL("/blocked", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/arena/:path*"],
};
