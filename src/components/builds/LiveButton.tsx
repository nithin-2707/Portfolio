"use client";

import { useRef, type PointerEvent as ReactPointerEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

type Edge = "left" | "right" | "top" | "bottom";

/** Where the fill rests, just outside the button, for each edge. */
const OFF: Record<Edge, { xPercent: number; yPercent: number }> = {
  left: { xPercent: -101, yPercent: 0 },
  right: { xPercent: 101, yPercent: 0 },
  top: { xPercent: 0, yPercent: -101 },
  bottom: { xPercent: 0, yPercent: 101 },
};

function nearestEdge(e: ReactPointerEvent<HTMLElement>): Edge {
  const r = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - r.left;
  const y = e.clientY - r.top;
  // compare distances in proportion to the box, so a wide button still reads top/bottom entries
  const d: Record<Edge, number> = { left: x / r.width, right: (r.width - x) / r.width, top: y / r.height, bottom: (r.height - y) / r.height };
  return (Object.keys(d) as Edge[]).reduce((a, b) => (d[a] <= d[b] ? a : b));
}

/**
 * Builds' "Test drive" (live site) button: a 1px Venice rectangle whose route-orange fill slides in from
 * the edge the pointer crossed and leaves through the edge it exits. Translate (not scale),
 * so a reversal mid-slide stays continuous. Keyboard focus fills from the left.
 */
export function LiveButton({ href, name }: { href: string; name: string }) {
  const ref = useRef<HTMLAnchorElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const hovering = useRef(false);
  const keyFocus = useRef(false);

  // show/hide live inside the GSAP context (reverted on unmount); handlers reach them through this ref
  const api = useRef<{ show: (edge: Edge) => void; hide: (edge: Edge) => void } | null>(null);

  useGSAP(
    (_, contextSafe) => {
      const fill = fillRef.current;
      if (!fill || !contextSafe) return;
      gsap.set(fill, { ...OFF.left, x: 0, y: 0, opacity: 1 });
      const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      api.current = {
        show: contextSafe((edge: Edge) => {
          const xp = Math.abs(Number(gsap.getProperty(fill, "xPercent")));
          const yp = Math.abs(Number(gsap.getProperty(fill, "yPercent")));
          const offscreen = xp >= 100 || yp >= 100 || Number(gsap.getProperty(fill, "opacity")) < 1;
          if (reduced()) {
            // no travel: the fill fades in place
            if (offscreen) gsap.set(fill, { xPercent: 0, yPercent: 0, opacity: 0 });
            gsap.to(fill, { opacity: 1, duration: 0.2, ease: "road", overwrite: true });
            return;
          }
          // start from the crossed edge unless a previous slide is still on screen (then continue from where it is)
          if (offscreen) gsap.set(fill, { ...OFF[edge], opacity: 1 });
          gsap.to(fill, { xPercent: 0, yPercent: 0, duration: 0.42, ease: "road", overwrite: true });
        }),
        hide: contextSafe((edge: Edge) => {
          if (reduced()) {
            gsap.to(fill, { opacity: 0, duration: 0.18, ease: "road", overwrite: true });
            return;
          }
          gsap.to(fill, { ...OFF[edge], duration: 0.34, ease: "road", overwrite: true });
        }),
      };
      return () => {
        api.current = null;
      };
    },
    { scope: ref },
  );

  return (
    <a
      ref={ref}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        hovering.current = true;
        if (!keyFocus.current) api.current?.show(nearestEdge(e));
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        hovering.current = false;
        if (!keyFocus.current) api.current?.hide(nearestEdge(e));
      }}
      onFocus={(e) => {
        if (!e.currentTarget.matches(":focus-visible")) return;
        keyFocus.current = true;
        if (!hovering.current) api.current?.show("left");
      }}
      onBlur={() => {
        if (!keyFocus.current) return;
        keyFocus.current = false;
        if (!hovering.current) api.current?.hide("right");
      }}
      className="group/live relative isolate inline-flex min-h-12 items-center gap-3 overflow-hidden border border-venice px-5 text-[0.95rem] font-semibold tracking-[0.01em] text-venice transition-[color,border-color,scale] duration-200 ease-out hover:border-route hover:text-night focus-visible:border-route focus-visible:text-night active:scale-[0.97]"
    >
      <span ref={fillRef} aria-hidden="true" className="absolute inset-0 -z-10 bg-route opacity-0" />
      <span>Test drive</span>
      <span className="sr-only">: {name} (opens in a new tab)</span>
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        className="size-3.5 transition-transform duration-200 ease-out group-hover/live:-translate-y-px group-hover/live:translate-x-px"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" />
      </svg>
    </a>
  );
}
