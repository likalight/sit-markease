import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/db/env";
import { setLocalSession } from "@/lib/auth/local-session";
import { localStore } from "@/lib/db/local-store";
import { getOrCreateDemoSubmission } from "@/lib/pipeline/demo";

// Landing page "See it in action" CTA — educator path. No signup, no empty
// state: auto-authenticates as the demo educator (fixture mode only) and
// drops straight into the review console for a fully-populated submission.
export async function GET(request: NextRequest) {
  if (!env.isFixtureMode()) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const educator = localStore.findOne("users", (u: any) => u.role === "educator");
  if (educator) {
    await setLocalSession({ userId: educator.id, email: educator.email, name: educator.name, role: "educator" });
  }

  const submissionId = await getOrCreateDemoSubmission();
  return NextResponse.redirect(new URL(`/review/${submissionId}`, request.url));
}
