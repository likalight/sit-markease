import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client. Bypasses RLS entirely — never import this into
// anything that ships to the browser. Use inside Route Handlers, Server
// Components, and standalone scripts (seed.ts, ingest-corpus.ts) only.
//
// Decision (docs/DECISIONS.md): no RLS policies are defined on the §9
// schema. All data access for this hackathon build goes through server-side
// route handlers using this client — acceptable for a demo, not for a real
// deployment with untrusted direct DB access.
export function supabaseAdmin() {
  return createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
