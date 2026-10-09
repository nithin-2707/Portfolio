"use client";

// Adapted from React Bits ScrollVelocity (reactbits.dev, MIT + Commons Clause).
// Structure: the row component lives at module scope (a parent re-render never remounts it and resets
// the marquee), copy width comes from a ResizeObserver (catches the late web-font swap), copies are aria-hidden
// with one sr-only label, and the frame loop is skipped off-screen and under reduced motion.
// Changed here:
//  - Speed reads Lenis's own velocity from the shared scrollState (written once per Lenis frame by SmoothScroll),
//    so the marquee and the page share one clock and no extra scroll listener is added.
//  - Each row takes its own content and className (row 1 outline, row 2 solid).

import { useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { motion, useAnimationFrame, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { scrollState } from "@/lib/stores";

function useElementWidth<T extends HTMLElement>(ref: RefObject<T | null>) {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // ResizeObserver reports once as soon as it starts observing, then on every size change.
    const ro = new ResizeObserver(() => setWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width;
}

function wrap(min: number, max: number, v: number) {
  const range = max - min;
  return ((((v - min) % range) + range) % range) + min;
}

type RowProps = {
  children: ReactNode;
  baseVelocity: number;
  className?: string;
  numCopies: number;
};

function VelocityRow({ children, baseVelocity, className = "", numCopies }: RowProps) {
  const rowRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(rowRef);
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const copyWidth = useElementWidth(copyRef);
  const x = useTransform(baseX, (v) => (copyWidth === 0 ? "0px" : `${wrap(-copyWidth, 0, v)}px`));
  const direction = useRef(1);
  const speed = useRef(0);

  useAnimationFrame((_, delta) => {
    if (!inView || reduce) return;
    const dt = Math.min(delta, 64);
    // Lenis velocity is px per frame. Ease toward it so a flick reads as a surge, not a jolt.
    speed.current += (scrollState.velocity - speed.current) * (1 - Math.exp(-dt / 140));
    // ≈ upstream mapping (1000 px/s -> 5x): 60 frames/s * v / 1000 * 5
    const factor = Math.max(-12, Math.min(12, speed.current * 0.3));
    if (factor < -0.01) direction.current = -1;
    else if (factor > 0.01) direction.current = 1;
    // driven by your scroll: at rest it coasts to a stop (no self-starting motion, WCAG 2.2.2)
    const drive = Math.min(1, Math.abs(speed.current) / 2);
    const moveBy = direction.current * baseVelocity * (dt / 1000) * (1 + Math.abs(factor)) * drive;
    baseX.set(baseX.get() + moveBy);
  });

  return (
    <div ref={rowRef} className="relative overflow-hidden" aria-hidden="true">
      <motion.div className="flex whitespace-nowrap will-change-transform" style={{ x }}>
        {Array.from({ length: numCopies }, (_, i) => (
          <span key={i} ref={i === 0 ? copyRef : undefined} className={`shrink-0 ${className}`}>
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}

export type VelocityRowSpec = { content: ReactNode; className?: string };

export interface ScrollVelocityProps {
  rows: VelocityRowSpec[];
  /** what a screen reader hears once, instead of the repeated copies */
  label: string;
  /** px per second at rest */
  velocity?: number;
  numCopies?: number;
  className?: string;
}

export default function ScrollVelocity({ rows, label, velocity = 60, numCopies = 3, className = "" }: ScrollVelocityProps) {
  return (
    <div className={className}>
      <span className="sr-only">{label}</span>
      {rows.map((row, index) => (
        <VelocityRow
          key={index}
          className={row.className}
          baseVelocity={index % 2 !== 0 ? -velocity : velocity}
          numCopies={numCopies}
        >
          {row.content}
        </VelocityRow>
      ))}
    </div>
  );
}
