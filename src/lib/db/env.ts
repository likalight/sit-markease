function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  supabaseUrl: () => required("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: () => required("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  sidecarUrl: () => process.env.SIDECAR_URL ?? "http://localhost:8000",
  isFixtureMode: () => process.env.AIMS_FIXTURE_MODE === "true",
  // Independent of isFixtureMode(): whether an AI cache miss should attempt
  // a real provider call. Lets AI calls go live against the local
  // fixture-mode DB, without needing a real Supabase project provisioned
  // too. See docs/DECISIONS.md.
  isAiLive: () => process.env.AIMS_AI_LIVE === "true",
};
