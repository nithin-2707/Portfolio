"use client";

/*
 * Adapted from React Bits StrokeText (reactbits.dev, MIT + Commons Clause), with a `ready` prop so it waits for the loader. Rebuilt for
 * the hero name:
 *
 * - The FILL is the real server-rendered <h1> text, not an SVG copy. It paints at first paint (LCP candidate,
 *   crawlable, selectable) and stays the final state. Only the pen STROKES are SVG.
 * - The SVG has no viewBox: user units are CSS pixels and <text> inherits font-family, size, weight and
 *   letter-spacing from the line, so every stroked glyph sits exactly on its HTML twin. The baseline is
 *   measured with a zero-size inline-block probe.
 * - Under the launch sheet (after one painted frame) the fill is clipped away; when `launched` flips the
 *   strokes draw letter by letter, then the ink floods each line left to right, then the strokes lift.
 * - Reduced motion, no JS, or arriving after launch: the name is simply there.
 */

import { useEffect, useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { launched as launchedFlag } from "@/lib/stores";
import { useLaunchExiting } from "@/components/launch/phase";
import { prefersReducedMotion } from "@/lib/useReducedMotion";

type StrokeTextProps = {
  id: string;
  lines: readonly string[];
  className?: string;
  strokeColor?: string;
  strokeWidth?: number;
  drawDuration?: number;
  stagger?: number;
};

const HIDDEN_FILL = "inset(-30% 100% -30% 0%)";
const SHOWN_FILL = "inset(-30% -6% -30% 0%)";

export function StrokeText({
  id,
  lines,
  className = "",
  strokeColor = "var(--color-venice)",
  strokeWidth = 1.25,
  drawDuration = 1.15,
  stagger = 0.04,
}: StrokeTextProps) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const dashRef = useRef(800);
  const armedRef = useRef(false);
  // start inking while the launch sheet opens, so the name is already being written as the hero appears
  const launched = useLaunchExiting();

  // keep each stroke layer on its line's baseline (font swap, resize, wrap)
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const lineEls = Array.from(root.querySelectorAll<HTMLElement>("[data-ink-line]"));
    const measure = () => {
      for (const line of lineEls) {
        const probe = line.querySelector<HTMLElement>("[data-ink-probe]");
        const text = line.querySelector<SVGTextElement>("text");
        if (!probe || !text) continue;
        const baseline = probe.getBoundingClientRect().top - line.getBoundingClientRect().top;
        text.setAttribute("y", baseline.toFixed(2));
      }
      dashRef.current = Math.ceil(parseFloat(getComputedStyle(root).fontSize) * 8);
    };
    measure();
    const ro = new ResizeObserver(measure);
    lineEls.forEach((l) => ro.observe(l));
    document.fonts?.ready.then(measure).catch(() => {});
    return () => ro.disconnect();
  }, []);

  // arm: under the launch sheet, after the real text has painted once, clip the fill and prime the pen
  useGSAP(
    (_, contextSafe) => {
      if (launchedFlag.get() || prefersReducedMotion()) return;
      const root = rootRef.current;
      if (!root || !contextSafe) return;
      const arm = contextSafe(() => {
        if (launchedFlag.get()) return;
        const dash = dashRef.current;
        gsap.set(root.querySelectorAll("[data-ink-fill]"), { clipPath: HIDDEN_FILL });
        gsap.set(root.querySelectorAll("[data-stroke-char]"), { strokeDasharray: dash, strokeDashoffset: dash });
        armedRef.current = true;
      });
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(arm);
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    },
    { scope: rootRef },
  );

  // ink: pen strokes, then the flood, then the pen lifts
  useGSAP(
    () => {
      const root = rootRef.current;
      if (!launched || !armedRef.current || !root) return;
      armedRef.current = false;
      const strokes = root.querySelectorAll("[data-stroke-char]");
      const fills = gsap.utils.toArray<HTMLElement>("[data-ink-fill]", root);
      const pens = root.querySelectorAll("[data-ink-svg]");

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      tl.set(pens, { autoAlpha: 1 });
      tl.to(strokes, { strokeDashoffset: 0, duration: drawDuration, ease: "road", stagger }, 0);
      fills.forEach((fill, i) => {
        tl.to(fill, { clipPath: SHOWN_FILL, duration: 0.75, ease: "steer" }, drawDuration * 0.7 + i * 0.16);
      });
      tl.to(pens, { autoAlpha: 0, duration: 0.45, ease: "power1.out" }, ">-0.2");
      tl.set(fills, { clearProps: "clipPath" });
    },
    { scope: rootRef, dependencies: [launched] },
  );

  return (
    <h1 ref={rootRef} id={id} className={className}>
      {lines.map((line, i) => (
        <span key={line} data-ink-line className="relative block w-fit">
          <span data-ink-fill className="block">
            {line}
            <span data-ink-probe className="inline-block h-0 w-0 align-baseline" />
            {i < lines.length - 1 ? " " : null}
          </span>
          <svg
            data-ink-svg
            aria-hidden="true"
            focusable="false"
            className="pointer-events-none invisible absolute top-0 left-0 h-full w-full overflow-visible select-none"
          >
            <text
              x="0"
              y="0"
              fill="none"
              strokeWidth={strokeWidth}
              strokeLinejoin="round"
              strokeLinecap="round"
              // a style, not the attribute: presentation attributes do not resolve var() everywhere
              style={{ whiteSpace: "pre", stroke: strokeColor }}
            >
              {Array.from(line).map((char, k) => (
                <tspan key={k} data-stroke-char>
                  {char}
                </tspan>
              ))}
            </text>
          </svg>
        </span>
      ))}
    </h1>
  );
}
