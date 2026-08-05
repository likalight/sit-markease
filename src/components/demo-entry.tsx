"use client";

import { useState } from "react";
import { enterDemoAction } from "@/app/enter/actions";
import { SubmitButton } from "./submit-button";

export function DemoEntry() {
  const [role, setRole] = useState<"educator" | "student">("educator");

  return (
    <form action={enterDemoAction} className="mx-auto flex w-full max-w-xl flex-col gap-md rounded-lg border border-primary-hairline bg-surface-card px-lg py-lg text-left shadow-sm">
      <input type="hidden" name="role" value={role} />
      <input type="hidden" name="studentId" value="111" />
      <div>
        <p className="text-caption-caps text-muted-soft">Reviewer demo</p>
        <h2 className="mt-xxs font-serif text-title-lg text-ink">Walk through SIT MarkEase</h2>
        <p className="mt-xs text-body-sm text-muted">
          No files to download. Pick a role, continue, and use the guided panels inside the app.
        </p>
      </div>

      <div className="grid grid-cols-2 rounded-sm border border-hairline bg-canvas p-xxs" role="tablist" aria-label="Demo role">
        <button
          type="button"
          onClick={() => setRole("educator")}
          className={`rounded-sm px-sm py-xs text-body-sm font-medium ${
            role === "educator" ? "bg-primary text-on-primary" : "text-muted hover:text-body"
          }`}
        >
          Instructor
        </button>
        <button
          type="button"
          onClick={() => setRole("student")}
          className={`rounded-sm px-sm py-xs text-body-sm font-medium ${
            role === "student" ? "bg-primary text-on-primary" : "text-muted hover:text-body"
          }`}
        >
          Student 111
        </button>
      </div>

      <div className="rounded-sm border border-hairline bg-canvas px-md py-sm">
        {role === "educator" ? (
          <p className="text-body-sm text-body">
            Start as the instructor: inspect the Math/Physics assignments, review uploaded scripts, approve summative
            work, and release results.
          </p>
        ) : (
          <p className="text-body-sm text-body">
            Start as Student 111: see issued assessments, continue the formative attempt, submit with the built-in demo
            script, then review feedback.
          </p>
        )}
      </div>

      <SubmitButton pendingLabel="Opening demo..." className="rounded-sm bg-ink px-md py-sm text-body-sm font-medium text-on-dark">
        Continue as {role === "educator" ? "Instructor" : "Student 111"}
      </SubmitButton>
    </form>
  );
}
