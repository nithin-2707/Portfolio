"use client";

import { useEffect, useRef } from "react";

/**
 * Wakes a free-tier API that sleeps when idle (ATScribe's, about a 30 s cold start) once its chapter is a
 * couple of screens away, so a visitor who presses "Test drive" meets a warm server. One fire-and-forget
 * request, no response read.
 */
export function WarmUp({ url }: { url: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        void fetch(url, { mode: "no-cors", cache: "no-store", keepalive: true }).catch(() => {});
      },
      { rootMargin: "1600px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [url]);
  return <span ref={ref} aria-hidden="true" hidden />;
}
