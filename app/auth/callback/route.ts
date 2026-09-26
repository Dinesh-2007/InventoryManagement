import { NextResponse, type NextRequest } from "next/server";

// This Supabase OAuth callback is no longer used — auth is now handled by Clerk.
// Redirect to dashboard for any lingering OAuth code params.
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard", request.url));
}
