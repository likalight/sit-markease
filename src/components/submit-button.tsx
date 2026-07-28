"use client";

import { useFormStatus } from "react-dom";

// Server-action form submits can take a couple of real network round trips
// (Supabase account lookup/creation + sign-in) — 2-3s isn't unusual. With no
// pending state the button just sits there looking dead for that whole
// window, which reads as "the app is broken" rather than "it's working."
export function SubmitButton({
  children,
  pendingLabel,
  className = "rounded-sm bg-primary px-lg py-sm text-title-sm font-medium text-on-primary",
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={`${className} disabled:opacity-60`}>
      {pending ? pendingLabel : children}
    </button>
  );
}
