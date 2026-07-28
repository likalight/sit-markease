import { env } from "@/lib/db/env";
import { signInAction, signInAsEducatorAction, signUpAction } from "./actions";
import { Logo } from "@/components/logo";

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
        <Logo className="mb-sm h-12 w-12" />
        <h1 className="font-serif text-display-sm text-ink">Practica</h1>
        <p className="text-body-sm text-muted">Students submit and get graded here. Sign in to continue.</p>
      </div>

      {error && (
        <p className="rounded-sm border border-disputed/30 bg-disputed-soft px-3 py-2 text-body-sm text-disputed">
          {error}
        </p>
      )}

      {fixtureMode ? (
        <div className="flex flex-col gap-lg">
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

          <form action={signInAsEducatorAction} className="border-t border-hairline pt-md">
            <button type="submit" className="text-caption text-muted-soft underline">
              Educator? Continue as Dr. Tan (demo)
            </button>
          </form>
        </div>
      ) : (
        <div className="flex flex-col gap-lg">
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
        </div>
      )}
    </main>
  );
}
