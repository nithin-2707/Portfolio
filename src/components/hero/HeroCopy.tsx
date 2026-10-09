"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * The hero's text block. As the hero scrolls away it travels up at 0.6x the page and fades a
 * little, so the map underneath reads as the deeper layer. Reduced motion keeps only the fade.
 */
export function HeroCopy({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      const section = el?.closest("section");
      if (!el || !section) return;
      const mm = gsap.matchMedia();
      const trigger = { trigger: section, start: "top top", end: "bottom top", scrub: true, invalidateOnRefresh: true };
      const fade = { ...trigger, end: "bottom 30%" };
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.to(el, { y: () => section.offsetHeight * 0.4, ease: "none", scrollTrigger: trigger });
        gsap.to(el, { opacity: 0, ease: "none", scrollTrigger: fade });
      });
      // phones (one column: the legend sits right under the copy) and reduced motion: fade only, no travel
      mm.add("(max-width: 767px), (prefers-reduced-motion: reduce)", () => {
        gsap.to(el, { opacity: 0, ease: "none", scrollTrigger: fade });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
