// middleware.ts
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  // Redirect legacy path to the unified auth page
  if (req.nextUrl.pathname === "/auth/login") {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    return NextResponse.redirect(url);
  }

  // otherwise continue
  return NextResponse.next();
}

// Only run on the legacy path we want to redirect
export const config = {
  matcher: ["/auth/login"],
};
