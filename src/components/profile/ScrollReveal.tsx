"use client";

// Adapted from React Bits ScrollReveal (reactbits.dev, MIT + Commons Clause).
// Changes for the Profile bio:
//  - Uses the site's single GSAP instance (@/lib/gsap), so the "road" ease set and Lenis sync apply.
//  - One tween, one ScrollTrigger, scoped by useGSAP: it never touches other ScrollTriggers on the page.
//  - Words rise from a faint, slightly blurred ink (baseOpacity / blurStrength) to full ink, scrubbed to scroll,
//    so reading pace equals scroll pace. Reduced motion: the text is simply visible.
//  - Renders one <p> (upstream nested a <p> inside an <h2>); the server HTML is fully readable without JS.

import { useMemo, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

export interface ScrollRevealProps {
  children: string;
  className?: string;
  wordClassName?: string;
  /** Opacity each word starts from (0..1). */
  baseOpacity?: number;
  /** Starting blur in px; 0 disables the blur. Keep it small (<= 4). */
  blurStrength?: number;
  start?: string;
  end?: string;
}

export default function ScrollReveal({
  children,
  className = "",
  wordClassName = "",
  baseOpacity = 0.18,
  blurStrength = 3,
  start = "top 80%",
  end = "bottom 45%",
}: ScrollRevealProps) {
  const ref = useRef<HTMLParagraphElement>(null);

  const words = useMemo(
    () =>
      children.split(/(\s+)/).map((word, i) =>
        /^\s+$/.test(word) ? (
          word
        ) : (
          <span key={i} data-sr-word="" className={`inline-block ${wordClassName}`}>
            {word}
          </span>
        ),
      ),
    [children, wordClassName],
  );

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const wordEls = el.querySelectorAll<HTMLElement>("[data-sr-word]");
        const blur = blurStrength > 0;
        gsap.fromTo(
          wordEls,
          blur ? { opacity: baseOpacity, filter: `blur(${blurStrength}px)` } : { opacity: baseOpacity },
          {
            opacity: 1,
            ...(blur ? { filter: "blur(0px)" } : {}),
            ease: "none",
            stagger: 0.05,
            scrollTrigger: { trigger: el, start, end, scrub: true },
          },
        );
      });
    },
    { scope: ref, dependencies: [children, baseOpacity, blurStrength, start, end], revertOnUpdate: true },
  );

  return (
    <p ref={ref} className={className}>
      {words}
    </p>
  );
}
