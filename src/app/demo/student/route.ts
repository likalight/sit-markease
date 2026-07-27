import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/db/env";
import { setLocalSession } from "@/lib/auth/local-session";
import { localStore } from "@/lib/db/local-store";
import { getOrCreateDemoSubmission } from "@/lib/pipeline/demo";

// Landing page second CTA — student path. Auto-authenticates as the demo
// student (fixture mode only) and drops straight into the student feedback
// view with real, populated output.
export async function GET(request: NextRequest) {
  if (!env.isFixtureMode()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const student = localStore.findOne("users", (u: any) => u.role === "student");
  if (student) {
    await setLocalSession({ userId: student.id, email: student.email, name: student.name, role: "student" });
  }

  await getOrCreateDemoSubmission(); // ensures at least one processed submission exists
  return NextResponse.redirect(new URL("/feedback", request.url));
}
