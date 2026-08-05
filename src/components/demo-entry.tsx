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
      <input type="hidden" name="next" value="/demo" />
      <div>
        <p className="text-caption-caps text-muted-soft">Reviewer demo</p>
        <h2 className="mt-xxs font-serif text-title-lg text-ink">Walk through SIT MarkEase</h2>
        <p className="mt-xs text-body-sm text-muted">
          No files to download. Continue into the mode-by-mode guide, then jump between Instructor and Student.
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
          Student
        </button>
      </div>

      <div className="rounded-sm border border-hairline bg-canvas px-md py-sm">
        {role === "educator" ? (
          <p className="text-body-sm text-body">
            You will start at the demo guide, then open the instructor screens for rubric setup, script upload, review,
            and release.
          </p>
        ) : (
          <p className="text-body-sm text-body">
            You will start at the demo guide, then open the student's assessments, feedback, and exam-prep flow.
          </p>
        )}
      </div>

      <SubmitButton pendingLabel="Opening demo..." className="rounded-sm bg-ink px-md py-sm text-body-sm font-medium text-on-dark">
        Continue as {role === "educator" ? "Instructor" : "Student"}
      </SubmitButton>
    </form>
  );
}
