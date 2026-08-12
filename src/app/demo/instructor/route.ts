import { NextResponse, type NextRequest } from "next/server";
import { signInAsEducator } from "@/lib/auth/demo-signin";

// One half of the "Open demo" two-tab flow (src/app/page.tsx's close
// slide) — a plain GET route, not a server action, since it needs to run
// from a second tab opened via window.open() rather than a form
// submission. Route Handlers can set the session cookie a Server
// Component page render cannot (Next.js only allows cookie writes in
// Server Actions and Route Handlers).
export async function GET(request: NextRequest) {
  await signInAsEducator();
  return NextResponse.redirect(new URL("/review", request.url));
}
