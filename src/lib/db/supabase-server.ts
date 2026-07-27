import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Session-aware client for use in Server Components / Route Handlers.
// Runs with the caller's auth session, respects whatever RLS exists.
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(env.supabaseUrl(), env.supabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component with no response to write to —
          // middleware refreshes the session instead. Safe to ignore.
        }
      },
    },
  });
}
