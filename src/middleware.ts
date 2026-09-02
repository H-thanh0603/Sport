import { NextRequest, NextResponse } from "next/server";
import { createMiddlewareClient } from "./auth-edge";

/**
 * Middleware: /admin guard (session + role) at edge before page render.
 * Auth check re-verified in layout (defense in depth).
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) {
    const { isModerator } = await createMiddlewareClient(req);
    if (!isModerator) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
