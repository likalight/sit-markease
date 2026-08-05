function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function requiredOne(names: string[]): string {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
  throw new Error(`Missing required env var: ${names.join(" or ")}`);
}

export const env = {
  supabaseUrl: () => requiredOne(["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_URL"]),
  supabaseAnonKey: () => requiredOne(["NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY"]),
  supabaseServiceRoleKey: () => required("SUPABASE_SERVICE_ROLE_KEY"),
  sidecarUrl: () => process.env.SIDECAR_URL ?? "http://localhost:8000",
  isFixtureMode: () => process.env.AIMS_FIXTURE_MODE === "true",
  // Independent of isFixtureMode(): whether an AI cache miss should attempt
  // a real provider call. Lets AI calls go live against the local
  // fixture-mode DB, without needing a real Supabase project provisioned
  // too. See docs/DECISIONS.md.
  isAiLive: () => process.env.AIMS_AI_LIVE === "true",
};
