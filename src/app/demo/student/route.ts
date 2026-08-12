import { NextResponse, type NextRequest } from "next/server";
import { signInAsStudent } from "@/lib/auth/demo-signin";

// Other half of the "Open demo" two-tab flow — see demo/instructor/route.ts.
export async function GET(request: NextRequest) {
  await signInAsStudent("111");
  return NextResponse.redirect(new URL("/submit", request.url));
}
