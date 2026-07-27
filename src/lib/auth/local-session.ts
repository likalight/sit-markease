import { cookies } from "next/headers";

// Fixture-mode auth stand-in — see docs/DECISIONS.md M2 entry. Only used
// when AIMS_FIXTURE_MODE=true. Plain, unsigned cookie; local dev only.
const COOKIE_NAME = "aims_local_session";

export interface LocalSession {
  userId: string;
  email: string;
  name: string;
  role: "educator" | "student" | "admin";
}

export async function setLocalSession(session: LocalSession) {
  const store = await cookies();
  store.set(COOKIE_NAME, JSON.stringify(session), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });
}

export async function getLocalSession(): Promise<LocalSession | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LocalSession;
  } catch {
    return null;
  }
}

export async function clearLocalSession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
