"use client";

import { useEffect, useState } from "react";

export function AttemptTimer({ expiresAt }: { expiresAt: string | null }) {
  const [seconds, setSeconds] = useState(() => expiresAt ? Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)) : null);
  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => setSeconds(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    const id = window.setInterval(tick, 1000);
    tick();
    return () => window.clearInterval(id);
  }, [expiresAt]);
  if (seconds === null) return <span>Untimed</span>;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return <span className={seconds <= 300 ? "text-disputed" : "text-body-strong"}>{minutes}:{String(remainder).padStart(2, "0")} remaining</span>;
}
