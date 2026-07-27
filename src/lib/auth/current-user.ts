import { env } from "@/lib/db/env";
import { getLocalSession } from "./local-session";
import { supabaseServer } from "@/lib/db/supabase-server";
import { supabaseAdmin } from "@/lib/db/supabase-admin";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "educator" | "student" | "admin";
}

// Single seam between fixture-mode local auth and real Supabase auth — every
// page/route that needs "who is logged in" goes through this instead of
// branching on AIMS_FIXTURE_MODE itself. See docs/DECISIONS.md M2 entry.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  if (env.isFixtureMode()) {
    const session = await getLocalSession();
    if (!session) return null;
    return { id: session.userId, email: session.email, name: session.name, role: session.role };
  }

  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return null;

  const { data: profile } = await supabaseAdmin()
    .from("users")
    .select("id, name, role")
    .eq("email", user.email)
    .single();
  if (!profile) return null;

  return { id: profile.id, email: user.email, name: profile.name, role: profile.role };
}
