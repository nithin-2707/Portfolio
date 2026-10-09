"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * The page's route passing under a build's name: a 3px route-orange road laid left to right under the title
 * when the chapter arrives, ending in a waypoint dot. Decorative; reduced motion and no-JS show it laid.
 */
export function TitleRoad() {
  const ref = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const q = gsap.utils.selector(el);
        gsap
          .timeline({ scrollTrigger: { trigger: el, start: "top 80%", once: true } })
          .fromTo(q("[data-road]"), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: "steer" })
          .fromTo(q("[data-dot]"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.3 }, "-=0.15");
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <span ref={ref} aria-hidden="true" className="relative mt-4 flex h-3 w-full max-w-[min(100%,26rem)] items-center">
      <span data-road="" className="h-[3px] flex-1 origin-left rounded-full bg-route" />
      <span data-dot="" className="-ml-1 size-3 rounded-full border-2 border-paper bg-route" />
    </span>
  );
}
