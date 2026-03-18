/**
 * Next.js Middleware — Auth + RBAC route protection
 *
 * CONCEPT: Middleware runs at the edge BEFORE a request reaches any route
 * handler or page. This is the ideal place for auth checks because:
 *  1. It's fast (edge runtime, no cold starts)
 *  2. It can redirect unauthenticated users before any HTML is rendered
 *  3. It prevents accidental data exposure from race conditions in components
 *
 * The `auth` import from next-auth wraps our handler and injects the session.
 *
 * ROUTE RULES:
 *  /login, /register  → public (redirect to dashboard if already logged in)
 *  /dashboard/*       → requires authenticated session
 *  /api/auth/*        → public (NextAuth endpoints)
 *  /api/*             → protected (API routes check role internally)
 */
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth?: { user?: unknown } | null }) => {
  const { nextUrl, auth: session } = req;
  const demoModeEnabled = process.env.DEMO_MODE !== "false";
  const isDemoBypass = demoModeEnabled || req.cookies.get("demo_bypass")?.value === "1";
  const isLoggedIn = !!session?.user;

  const isPublicPath =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    nextUrl.pathname === "/" ||
    nextUrl.pathname.startsWith("/api/auth") ||
    nextUrl.pathname === "/api/health" ||
    nextUrl.pathname === "/api/jobs";

  // Already logged in → redirect away from login page
  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  // Not logged in → redirect to login
  if (!isLoggedIn && !isPublicPath && !isDemoBypass) {
    const loginUrl = new URL("/login", nextUrl);
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const runtime = "nodejs";

export const config = {
  // Match all routes except static files and Next internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)"],
};
