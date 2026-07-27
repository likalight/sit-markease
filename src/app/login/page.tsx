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
        <h1 className="text-2xl font-semibold">AIMS</h1>
        <p className="text-sm text-neutral-500">Sign in to continue.</p>
      </div>

      {error && (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {fixtureMode ? (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-400">
            Fixture mode — no Supabase project configured. Pick a demo role to continue.
          </p>
          <form action={signInAction} className="flex flex-col gap-2">
            <input type="hidden" name="role" value="educator" />
            <button
              type="submit"
              className="rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
            >
              Continue as educator (Dr. Tan)
            </button>
          </form>
          <form action={signInAction} className="flex flex-col gap-2">
            <input type="hidden" name="role" value="student" />
            <button
              type="submit"
              className="rounded border border-neutral-300 px-3 py-2 text-sm font-medium"
            >
              Continue as student (Wei Ming)
            </button>
          </form>
        </div>
      ) : (
        <form action={signInAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              name="email"
              type="email"
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              name="password"
              type="password"
              required
              className="rounded border border-neutral-300 px-3 py-2"
            />
          </label>
          <button
            type="submit"
            className="mt-2 rounded bg-neutral-900 px-3 py-2 text-sm font-medium text-white"
          >
            Sign in
          </button>
        </form>
      )}

      <p className="text-xs text-neutral-400">
        Demo accounts are created by <code>npm run seed</code> — see <code>.env.example</code>.
      </p>
    </main>
  );
}
