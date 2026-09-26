import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/",
  "/about",
  "/terms",
  "/privacy",
  "/disclaimer",
  "/contact",
  "/403",
]);

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
]);

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // Match prefix patterns for auth routes and sign-in/sign-up dynamic segments
  const publicPrefixes = ["/sign-in", "/sign-up", "/auth/"];
  return publicPrefixes.some((p) => pathname.startsWith(p));
}

export default clerkMiddleware(async (auth, req) => {
  const { pathname } = req.nextUrl;

  // Legacy URL redirects
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/sign-in", req.url));
  }
  if (pathname === "/signup") {
    return NextResponse.redirect(new URL("/sign-up", req.url));
  }

  // Allow public and auth paths without any checks
  if (isPublic(pathname) || AUTH_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  // Protect all other routes — this triggers Clerk's auth check
  const { userId, sessionClaims } = await auth.protect();
  if (!userId) return NextResponse.next();

  // Role-based routing: redirect bare /dashboard to the correct dashboard
  const role = (sessionClaims?.metadata as { role?: string } | undefined)?.role;

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    if (role === "inventory_manager") {
      return NextResponse.redirect(new URL("/dashboard/manager", req.url));
    }
    if (role === "warehouse_staff") {
      return NextResponse.redirect(new URL("/dashboard/warehouse", req.url));
    }
    // If role claim not in JWT, continue to /dashboard page which fetches role via server
    return NextResponse.next();
  }

  // Protect manager-only routes from warehouse staff
  const isManagerRoute =
    pathname.startsWith("/dashboard/manager") ||
    pathname.startsWith("/products/categories") ||
    pathname.startsWith("/products/reorder-rules") ||
    pathname.startsWith("/settings/warehouses") ||
    pathname.startsWith("/settings/locations") ||
    pathname.startsWith("/operations/adjustments");

  if (role && isManagerRoute && role !== "inventory_manager") {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // Protect warehouse-only routes from managers
  const isWarehouseRoute =
    pathname.startsWith("/dashboard/warehouse") ||
    pathname.startsWith("/tasks") ||
    pathname.startsWith("/picking") ||
    pathname.startsWith("/shelving") ||
    pathname.startsWith("/stock-counting");

  if (role && isWarehouseRoute && role !== "warehouse_staff") {
    return NextResponse.redirect(new URL("/403", req.url));
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
    "/__clerk/:path*",
  ],
};
