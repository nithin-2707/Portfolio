"use client";

// Adapted from React Bits FoldText (reactbits.dev, MIT + Commons Clause).
// Changes:
//  - Runs on the site's GSAP (@/lib/gsap) through useGSAP, so it is scoped and reverted with the component.
//  - Word split only, and real spaces between words: upstream joined words with no-break spaces, which glues a
//    whole headline into one unbreakable line on narrow screens.
//  - Type size, weight, tracking and colour come from the parent heading; the injected sheet carries only the
//    fold mechanics (hoisted once into <head> via React's <style href precedence>).
//  - The crease shade is tinted with night ink instead of black, so it reads as a fold in the paper sheet.
//  - Reduced motion: each word simply fades in. No JS: the heading is plain, visible text.

import { useMemo, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

const FOLD_CSS = `
.fold-text-segment{display:inline-block;perspective:var(--fold-perspective,700px);transform-style:preserve-3d;vertical-align:baseline}
.fold-text-piece{position:relative;display:inline-block;transform-style:preserve-3d;backface-visibility:hidden}
.fold-text-piece::after{content:"";position:absolute;inset:-0.06em -0.03em;pointer-events:none;opacity:var(--fold-crease,0);mix-blend-mode:multiply;border-radius:0.04em;background:linear-gradient(180deg,color-mix(in srgb,var(--color-night) 62%,transparent) 0%,color-mix(in srgb,var(--color-night) 20%,transparent) 44%,color-mix(in srgb,var(--color-paper) 26%,transparent) 100%)}
@media (prefers-reduced-motion:reduce){.fold-text-piece{transform:none!important}.fold-text-piece::after{opacity:0!important}}
`;

export interface FoldTextProps {
  text: string;
  /** seconds per word */
  duration?: number;
  /** seconds between words */
  stagger?: number;
  perspective?: number;
  /** 0..1 strength of the crease shade at the start of the unfold */
  creaseShading?: number;
  /** ScrollTrigger start */
  start?: string;
  className?: string;
}

export default function FoldText({
  text,
  duration = 0.95,
  stagger = 0.085,
  perspective = 700,
  creaseShading = 0.45,
  start = "top 82%",
  className = "",
}: FoldTextProps) {
  const rootRef = useRef<HTMLSpanElement>(null);

  const segments = useMemo(
    () =>
      text
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part, i) =>
          /^\s+$/.test(part) ? (
            " "
          ) : (
            <span key={i} className="fold-text-segment">
              <span className="fold-text-piece">{part}</span>
            </span>
          ),
        ),
    [text],
  );

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;
      const pieces = root.querySelectorAll<HTMLElement>(".fold-text-piece");
      if (!pieces.length) return;
      const mm = gsap.matchMedia();
      mm.add(
        { motion: "(prefers-reduced-motion: no-preference)", reduce: "(prefers-reduced-motion: reduce)" },
        (ctx) => {
          const { reduce } = ctx.conditions as { motion: boolean; reduce: boolean };
          const trigger = { trigger: root, start, once: true };
          if (reduce) {
            gsap.fromTo(pieces, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, stagger: 0.03, ease: "road", scrollTrigger: trigger });
            return;
          }
          // Each word is a sheet hinged at its top edge, folded back behind the line, and opens toward you.
          gsap.fromTo(
            pieces,
            { autoAlpha: 0, rotateX: -92, "--fold-crease": creaseShading, transformOrigin: "50% 0%" },
            {
              autoAlpha: 1,
              rotateX: 0,
              "--fold-crease": 0,
              duration,
              stagger,
              ease: "road",
              force3D: true,
              scrollTrigger: trigger,
            },
          );
        },
      );
    },
    { scope: rootRef, dependencies: [text, duration, stagger, creaseShading, start], revertOnUpdate: true },
  );

  return (
    <span ref={rootRef} className={className} style={{ ["--fold-perspective" as string]: `${perspective}px` }}>
      <style href="fold-text-mechanics" precedence="medium">
        {FOLD_CSS}
      </style>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">{segments}</span>
    </span>
  );
}
