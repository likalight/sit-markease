import { env } from "@/lib/db/env";
import { signInAction } from "./actions";

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
        <h1 className="font-serif text-display-sm text-ink">Stepwise</h1>
        <p className="text-body-sm text-muted">Sign in to continue.</p>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-3 py-2 text-body-sm text-disputed">
          {error}
        </p>
      )}

      {fixtureMode ? (
        <div className="flex flex-col gap-3">
          <p className="text-caption text-muted-soft">
            Fixture mode — no Supabase project configured. Pick a demo role to continue.
          </p>
          <form action={signInAction} className="flex flex-col gap-2">
            <input type="hidden" name="role" value="educator" />
            <button
              type="submit"
              className="rounded-sm bg-ink px-3 py-2 text-body-sm font-medium text-on-dark"
            >
              Continue as educator (Dr. Tan)
            </button>
          </form>
          <form action={signInAction} className="flex flex-col gap-2">
            <input type="hidden" name="role" value="student" />
            <button
              type="submit"
              className="rounded-sm border border-hairline px-3 py-2 text-body-sm font-medium text-body"
            >
              Continue as student (Wei Ming)
            </button>
          </form>
        </div>
      ) : (
        <form action={signInAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-body-sm text-body">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded-sm border border-hairline px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-body-sm text-body">
            Password
            <input
              name="password"
              type="password"
              required
              className="rounded-sm border border-hairline px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded-sm bg-ink px-3 py-2 text-body-sm font-medium text-on-dark"
          >
            Sign in
          </button>
        </form>
      )}

      <p className="text-caption text-muted-soft">
        Demo accounts are created by <code>npm run seed</code> — see <code>.env.example</code>.
      </p>
    </main>
  );
}
