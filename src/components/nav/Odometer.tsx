"use client";

/*
 * Adapted from React Bits Counter (reactbits.dev, MIT + Commons Clause), rebuilt as a mechanical odometer:
 * - Driven by a MotionValue written from a gsap.ticker callback (scroll distance), so the page never
 *   re-renders React while you scroll. No useSpring per digit: Lenis already smooths the input.
 * - Real odometer carry: the tenths drum turns continuously; each higher drum only rolls during the last
 *   tenth of the drum below it, the way the wheels in a car's trip meter push each other over.
 * - Fixed places, so hook order and keys never change (the upstream auto-places re-key columns at 9.9 -> 10.0).
 * - The default black gradient overlays are replaced by a mask, so the drums fade into whatever paper the
 *   nav sits on. Hidden from assistive tech; it is a metaphor, not data.
 */

import { motion, useTransform, type MotionValue } from "motion/react";

type Place = number | ".";

/**
 * Drum position for `place`, in digits. The lowest drum is detented: it holds on a digit and clicks
 * over during the last 30% of each step, so the reading is legible at rest. Every higher drum carries
 * from the VISUAL position of the drum below it, exactly like the wheels of a mechanical trip meter.
 */
function drumPosition(value: number, place: number, lowest: number): number {
  if (place <= lowest * 1.0001) {
    const x = Math.max(0, value) / lowest;
    const whole = Math.floor(x + 1e-9);
    const t = Math.min(1, Math.max(0, (x - whole - 0.7) / 0.3));
    return whole + t * t * (3 - 2 * t);
  }
  const below = drumPosition(value, place / 10, lowest);
  return Math.floor(below / 10 + 1e-9) + Math.max(0, (below % 10) - 9);
}

function Numeral({ position, n, height }: { position: MotionValue<number>; n: number; height: number }) {
  // upstream Counter's placement: each numeral sits on a 10-step ring, wrapping at +-5
  const y = useTransform(position, (latest) => {
    const place = ((latest % 10) + 10) % 10;
    const offset = (10 + n - place) % 10;
    let memo = offset * height;
    if (offset > 5) memo -= 10 * height;
    return memo;
  });
  return (
    <motion.span className="absolute inset-0 flex items-center justify-center" style={{ y }}>
      {n}
    </motion.span>
  );
}

function Drum({ value, place, lowest, height }: { value: MotionValue<number>; place: number; lowest: number; height: number }) {
  const position = useTransform(value, (v) => drumPosition(v, place, lowest));
  return (
    <span className="relative inline-block w-[1ch] overflow-hidden" style={{ height }}>
      {Array.from({ length: 10 }, (_, n) => (
        <Numeral key={n} position={position} n={n} height={height} />
      ))}
    </span>
  );
}

export function Odometer({
  value,
  places = [10, 1, ".", 0.1],
  height = 18,
  className = "",
}: {
  value: MotionValue<number>;
  places?: readonly Place[];
  height?: number;
  className?: string;
}) {
  const lowest = Math.min(...places.filter((p): p is number => typeof p === "number"));
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center tabular-nums [mask-image:linear-gradient(to_bottom,transparent,#000_20%,#000_80%,transparent)] ${className}`}
      style={{ height, lineHeight: `${height}px` }}
    >
      {places.map((place) =>
        place === "." ? (
          <span key="dot" className="inline-block">
            .
          </span>
        ) : (
          <Drum key={place} value={value} place={place} lowest={lowest} height={height} />
        ),
      )}
    </span>
  );
}
