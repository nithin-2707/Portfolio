"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Licences list entrance: each Verify tab is stamped onto the sheet as the list arrives
 * (comes down large and slightly turned, lands with a tiny settle). Children stay
 * server-rendered and visible without JS; reduced motion gets a plain fade.
 */
export function StampIn({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const stamps = gsap.utils.toArray<HTMLElement>("[data-stamp]", ref.current);
      if (!stamps.length) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.set(stamps, { scale: 1.35, rotation: -7, opacity: 0 });
        const tl = gsap.timeline({ scrollTrigger: { trigger: ref.current, start: "top 78%", once: true } });
        tl.to(stamps, {
          keyframes: [
            // accelerate into the paper (an impact, so ease-in is the honest curve here)...
            { scale: 0.96, rotation: 0, opacity: 1, duration: 0.24, ease: "power3.in" },
            // ...then the rubber relaxes
            { scale: 1, duration: 0.16, ease: "road" },
          ],
          stagger: 0.09,
        }).set(stamps, { clearProps: "transform,opacity" });
      });
      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.from(stamps, { opacity: 0, duration: 0.4, scrollTrigger: { trigger: ref.current, start: "top 78%", once: true } });
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
