import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/facade";

// PUT /api/practice-items/:id/attempt — save the current student's attempt
// on a practice item (response text, hints revealed, self-reported
// outcome). One row per (item, student); revisiting the page updates it
// rather than losing it on refresh.
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: { code: "FORBIDDEN", message: "student role required" } }, { status: 403 });
  }

  const { id: practiceItemId } = await params;
  const body = await request.json();
  const { response, hintsUsed, outcome } = body as {
    response?: string;
    hintsUsed?: number;
    outcome?: "correct" | "partial" | "incorrect" | null;
  };

  const attempt = await db.upsertPracticeAttempt({
    practiceItemId,
    studentId: user.id,
    response,
    hintsUsed,
    outcome: outcome ?? null,
  });

  return NextResponse.json({ attemptId: (attempt as any).id });
}
