"use client";

import { useEffect, useState } from "react";
import { formatCountdown } from "@/lib/f1/schedule-utils";

type F1CountdownProps = {
  targetMs: number;
  /** Server time used for the first render so the server and browser markup match. */
  initialNowMs: number;
};

/** Counts down to a UTC instant. It keeps its own timer so the rest of the page does not re-render every second. */
export function F1Countdown({ targetMs, initialNowMs }: F1CountdownProps) {
  const [nowMs, setNowMs] = useState(initialNowMs);

  useEffect(() => {
    const interval = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  if (nowMs >= targetMs) {
    return <span className="tabular-nums">Starting now</span>;
  }

  return <span className="tabular-nums">{formatCountdown(targetMs, nowMs)}</span>;
}
