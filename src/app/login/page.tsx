import Link from "next/link";
import { env } from "@/lib/db/env";
import { signInAction, signUpAction } from "./actions";
import { enterAsEducatorAction } from "../enter/actions";
import { Logo } from "@/components/logo";

// Full email/password account creation — for onboarding real students beyond
// the 3 fixed test IDs on /enter/student. Most testing right now should use
// that quicker gate instead; this page exists for the eventual real-class
// rollout, not as the primary entry point.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const fixtureMode = env.isFixtureMode();

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6">
      <div>
        <Logo className="mb-sm h-12 w-auto" />
        <h1 className="font-serif text-display-sm text-ink">Continue as an instructor</h1>
        <p className="text-body-sm text-muted">
          Straight into the review queue — no account needed for a live demo.
        </p>
        <p className="mt-xs text-body-sm text-muted">
          Testing as a student instead? <Link href="/enter/student" className="underline">Use the quick student entry</Link>.
        </p>
      </div>

      {error && (
        <p className="rounded-sm border border-[color-mix(in_srgb,var(--color-disputed)_30%,transparent)] bg-disputed-soft px-3 py-2 text-body-sm text-disputed">
          {error}
        </p>
      )}

      {/* Same one-click pattern as /enter/student — not gated behind
          fixture mode, since a live-mode presenter needs this exactly as
          much as a fixture-mode one. Previously only rendered when
          AIMS_FIXTURE_MODE=true, which silently broke the demo's
          instructor entry point whenever run against real providers. */}
      <form action={enterAsEducatorAction}>
        <button type="submit" className="w-full rounded-sm bg-primary px-3 py-2 text-body-sm font-medium text-on-primary">
          Continue as Dr. Tan (demo) →
        </button>
      </form>

      <details className="text-body-sm text-muted">
        <summary className="cursor-pointer text-caption-caps text-muted-soft">Full account sign-in instead</summary>
        <div className="mt-sm flex flex-col gap-lg">
          {fixtureMode ? (
            <>
              <form action={signInAction} className="flex flex-col gap-2">
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Email
                  <input name="email" type="email" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <button type="submit" className="rounded-sm bg-ink px-3 py-2 text-body-sm font-medium text-on-dark">
                  Sign in
                </button>
              </form>

              <form action={signUpAction} className="flex flex-col gap-2 border-t border-hairline pt-md">
                <p className="text-caption-caps text-muted-soft">New student</p>
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Name
                  <input name="name" type="text" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Email
                  <input name="email" type="email" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <button type="submit" className="rounded-sm bg-primary px-3 py-2 text-body-sm font-medium text-on-primary">
                  Sign up
                </button>
              </form>
            </>
          ) : (
            <>
              <form action={signInAction} className="flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Email
                  <input name="email" type="email" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Password
                  <input name="password" type="password" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <button type="submit" className="mt-2 rounded-sm bg-ink px-3 py-2 text-body-sm font-medium text-on-dark">
                  Sign in
                </button>
              </form>

              <form action={signUpAction} className="flex flex-col gap-3 border-t border-hairline pt-lg">
                <p className="text-caption-caps text-muted-soft">New student</p>
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Name
                  <input name="name" type="text" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Email
                  <input name="email" type="email" required className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <label className="flex flex-col gap-1 text-body-sm text-body">
                  Password
                  <input name="password" type="password" required minLength={8} className="rounded-sm border border-hairline px-3 py-2" />
                </label>
                <button type="submit" className="rounded-sm bg-primary px-3 py-2 text-body-sm font-medium text-on-primary">
                  Sign up
                </button>
              </form>
            </>
          )}
        </div>
      </details>
    </main>
  );
}
