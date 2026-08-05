import { enterDemoAction } from "@/app/enter/actions";
import type { CurrentUser } from "@/lib/auth/current-user";

export function DemoRoleSwitcher({ user }: { user: CurrentUser }) {
  const isEducator = user.role === "educator";

  return (
    <div className="fixed right-md top-md z-40 hidden rounded-sm border border-primary-hairline bg-canvas/95 p-xxs shadow-sm backdrop-blur md:block">
      <div className="grid grid-cols-2 gap-xxs">
        <form action={enterDemoAction}>
          <input type="hidden" name="role" value="educator" />
          <button
            type="submit"
            className={`rounded-sm px-sm py-xxs text-caption font-medium ${
              isEducator ? "bg-primary text-on-primary" : "text-muted hover:bg-surface-soft hover:text-body"
            }`}
          >
            Instructor
          </button>
        </form>
        <form action={enterDemoAction}>
          <input type="hidden" name="role" value="student" />
          <input type="hidden" name="studentId" value="111" />
          <button
            type="submit"
            className={`rounded-sm px-sm py-xxs text-caption font-medium ${
              !isEducator ? "bg-primary text-on-primary" : "text-muted hover:bg-surface-soft hover:text-body"
            }`}
          >
            Student 111
          </button>
        </form>
      </div>
    </div>
  );
}
