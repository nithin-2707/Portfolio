"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * The finish line: a two-row chequered band across the top of the Finish field, where the page's route ends.
 * It is laid down left to right as the section arrives (the flag sweeping across), once. Reduced motion and
 * no-JS show it laid.
 */
export function ChequeredLine() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          el,
          { clipPath: "inset(0% 100% 0% 0%)" },
          {
            clipPath: "inset(0% 0% 0% 0%)",
            duration: 1.1,
            ease: "steer",
            scrollTrigger: { trigger: el, start: "top 88%", once: true },
          },
        );
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={ref}
      data-finish-line=""
      aria-hidden="true"
      className="absolute inset-x-0 top-0 h-5 [background:conic-gradient(var(--color-night)_25%,var(--color-paper)_0_50%,var(--color-night)_0_75%,var(--color-paper)_0)_0_0/20px_20px]"
    />
  );
}
