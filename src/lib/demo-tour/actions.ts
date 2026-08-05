"use server";

import { redirect } from "next/navigation";
import { signInAsStudent, signInAsEducator } from "@/lib/auth/demo-signin";
import { TOUR_ENTRY_PATH, type TourMode } from "./config";

// Landing-page "Try a guided demo" buttons call this — one click, no
// typing: signs in as the educator (both tours now open with the
// instructor building/issuing the assessment before anything else) and
// lands on the first real page of that flow. `?tour=<mode>` on the
// redirect is how the client GuidedTour bootstraps its (client-side-only)
// step tracker — see guided-tour.tsx for why step advancement isn't
// server/cookie-driven: a server round trip racing against the real
// button's own click-triggered navigation was silently losing that race
// and stranding the tour.
export async function startTourAction(mode: TourMode) {
  await signInAsEducator();
  redirect(`${TOUR_ENTRY_PATH[mode]}?tour=${mode}`);
}

// The one tour transition that genuinely needs the server: switching which
// real persona is signed in. Deliberately triggered by its own dedicated
// tour button (never bundled onto a real product button's click) so there
// is no navigation to race against — this call fully resolves, including
// its redirect, before anything else happens.
export async function switchRoleAction(role: "student" | "educator", redirectTo: string) {
  if (role === "student") {
    await signInAsStudent("111");
  } else {
    await signInAsEducator();
  }
  redirect(redirectTo);
}
