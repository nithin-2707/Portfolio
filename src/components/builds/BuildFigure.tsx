"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import type { Build } from "@/content/site";
import AccordionGallery from "./AccordionGallery";

type Box = { w: number; h: number };

/** Gap between the gallery edge and a callout label, px (matches the 0.875rem offsets below). */
const LEAD_OUT = 14;
/** Must match the gallery's fit-mode props below: closed tab width and gap, px. */
const TAB = 56;
const GAP = 8;

/**
 * One build's screenshots: the AccordionGallery, plus leader-line callouts that annotate the
 * gallery like a surveyed map sheet. At >= 1280px each callout is an orange node on the gallery,
 * a 1px Venice leader (cased in paper so it reads over any screenshot) and a label parked in the
 * column margin, never over the screenshot. Below 1280px the nodes carry numbers and the labels
 * become a numbered key under the gallery.
 */
export function BuildFigure({ build }: { build: Build }) {
  const rootRef = useRef<HTMLElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const irisRef = useRef<HTMLDivElement>(null);
  const [shot, setShot] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const ready = box !== null;

  // Gallery box size in px, so leaders are drawn in real pixels (DrawSVG needs true lengths).
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setBox((prev) => (prev && Math.abs(prev.w - width) < 0.5 && Math.abs(prev.h - height) < 0.5 ? prev : { w: width, h: height }));
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      const q = gsap.utils.selector(rootRef);

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: boxRef.current, start: "top 78%", once: true },
          defaults: { ease: "road" },
        });

        // The sheet opens: the gallery irises out from its centre, like a map being unfolded flat.
        // (explicit end value: GSAP cannot interpolate a clip-path towards "none")
        tl.fromTo(
          irisRef.current,
          { clipPath: "inset(10% 16% 10% 16% round 10px)", scale: 0.97 },
          // ends past the edges so the panels' shadows are never cut, then the clip is removed
          { clipPath: "inset(-6% -4% -10% -4% round 10px)", scale: 1, duration: 1.1, ease: "steer", clearProps: "clipPath,transform" },
        );

        // Wide screens: node, then its leader draws out to the margin, then the label lands. 120ms apart.
        build.callouts.forEach((_, i) => {
          const at = 0.6 + i * 0.12;
          tl.from(q(`[data-node="${i}"]`), { scale: 0.35, opacity: 0, transformOrigin: "50% 50%", duration: 0.3 }, at);
          // cleared afterwards: a resize redraws the leader at a new length, a stale dash would cut it short
          tl.from(q(`[data-leader="${i}"]`), { drawSVG: "0%", duration: 0.55, clearProps: "strokeDasharray,strokeDashoffset" }, at + 0.08);
          tl.fromTo(
            q(`[data-label="${i}"]`),
            { opacity: 0, filter: "blur(4px)" },
            { opacity: 1, filter: "blur(0px)", duration: 0.35, clearProps: "filter" },
            at + 0.42,
          );
          // Narrower screens: the numbered markers pop in on the same beat (inner span: the outer one is centred by CSS translate).
          tl.from(q(`[data-marker="${i}"]`), { scale: 0.6, opacity: 0, duration: 0.3, clearProps: "transform,opacity" }, at);
        });
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.from(q("[data-node], [data-leader], [data-label], [data-marker]"), {
          opacity: 0,
          duration: 0.4,
          scrollTrigger: { trigger: boxRef.current, start: "top 78%", once: true },
        });
      });

      return () => mm.revert();
    },
    { scope: rootRef, dependencies: [ready] },
  );

  const current = build.shots[shot] ?? build.shots[0];
  // callout nodes sit on the OPEN screen, wherever it is in the row (the closed tabs stay clean)
  const n = build.shots.length;
  const openW = box ? box.w - (n - 1) * (TAB + GAP) : 0;
  const openLeft = shot * (TAB + GAP);
  const nodeX = (cx: number) => openLeft + cx * openW;
  // the callouts are placed on the first screen; on the others they step aside
  const annotated = shot === 0;
  // lanes: the inner lane faces the text column, the outer one may borrow the page gutter
  // full-width figure: equal margin lanes for the callout labels on both sides
  const lanes = "xl:mx-[9.75rem]";

  return (
    <figure ref={rootRef} className="relative m-0">
      <div className={lanes}>
        <div ref={boxRef} className="relative">
          <div ref={irisRef}>
            <AccordionGallery
              items={build.shots.map((s) => ({ image: s.src, label: s.label, alt: s.alt }))}
              ariaLabel={`${build.name} screenshots`}
              activeIndex={shot}
              onActiveChange={setShot}
              aspect={1.6}
              collapsed={TAB}
              showLabels={false}
              gap={GAP}
              radius={10}
              tilt={6}
              parallax={0.45}
              duration={0.62}
              grayscale
              trigger="click"
              accentColor="var(--color-route)"
              overlayColor="var(--color-ink)"
              textColor="var(--color-paper)"
              sizes="(min-width: 1440px) 1000px, (min-width: 1280px) 64vw, 92vw"
            />
          </div>

          {/* >= 1280: leaders and nodes, drawn in gallery pixels; overflow carries them into the margins */}
          {box && annotated && (
            <svg
              key={shot}
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 z-10 hidden overflow-visible xl:block ${ready ? "callout-swap" : ""}`}
              width={box.w}
              height={box.h}
              viewBox={`0 0 ${box.w} ${box.h}`}
            >
              {build.callouts.map((c, i) => {
                const x = nodeX(c.x);
                const y = c.y * box.h;
                const end = c.side === "left" ? -LEAD_OUT : box.w + LEAD_OUT;
                const d = `M ${x} ${y} H ${end}`;
                return (
                  <g key={c.text}>
                    <path data-leader={i} d={d} fill="none" className="stroke-paper" strokeOpacity="0.7" strokeWidth="3" strokeLinecap="round" />
                    <path data-leader={i} d={d} fill="none" className="stroke-venice" strokeWidth="1" />
                    <circle data-node={i} cx={x} cy={y} r="3" className="fill-route stroke-paper" strokeWidth="1.5" />
                  </g>
                );
              })}
            </svg>
          )}

          {/* >= 1280: labels parked in the column margins */}
          <ol className={`m-0 hidden list-none p-0 transition-opacity duration-300 xl:block ${annotated ? "opacity-100" : "pointer-events-none opacity-0"}`}>
            {build.callouts.map((c, i) => (
              <li
                key={c.text}
                data-label={i}
                className={`absolute z-10 w-[8.5rem] -translate-y-1/2 border border-paper-line bg-paper px-2.5 py-1.5 text-[13px] leading-[1.35] text-ink ${
                  c.side === "left" ? "right-[calc(100%+0.875rem)] text-right" : "left-[calc(100%+0.875rem)]"
                }`}
                style={{ top: `${c.y * 100}%` }}
              >
                <span className="mb-0.5 block text-[11px] font-semibold text-venice">Pace note {i + 1}</span>
                {c.text}
              </li>
            ))}
          </ol>

          {/* < 1280: numbered markers on the gallery, keyed to the list below */}
          {annotated && build.callouts.map((c, i) => (
            <span
              key={`${c.text}-${shot}`}
              aria-hidden="true"
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 max-[520px]:hidden xl:hidden"
              style={{ left: box ? `${nodeX(c.x)}px` : `${c.x * 100}%`, top: `${c.y * 100}%` }}
            >
              <span
                data-marker={i}
                className="flex items-center gap-1 rounded-full border border-paper-line bg-paper py-0.5 pl-1 pr-1.5 text-[11px] font-semibold leading-none tabular-nums text-ink shadow-[0_4px_10px_-6px_color-mix(in_srgb,var(--color-ink)_60%,transparent)]"
              >
                <span className="size-1.5 rounded-full bg-route" />
                {i + 1}
              </span>
            </span>
          ))}
        </div>

        <figcaption className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[0.95rem] text-ink/75">
          <span className="font-semibold text-ink">{current.label}</span>
          <span className="min-w-0">{current.alt}</span>
        </figcaption>

        <p className="mt-8 text-[0.875rem] font-semibold text-venice xl:hidden">Pace notes</p>
        <ol className="mt-3 grid list-none gap-x-8 gap-y-3 p-0 sm:grid-cols-2 xl:hidden">
          {build.callouts.map((c, i) => (
            <li key={c.text} className="flex items-start gap-3 text-[0.9rem] leading-snug text-ink/85">
              <span className="mt-px inline-flex shrink-0 items-center gap-1 rounded-full border border-paper-line bg-paper py-0.5 pl-1 pr-1.5 text-[11px] font-semibold leading-none tabular-nums text-ink">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-route" />
                {i + 1}
              </span>
              <span>{c.text}</span>
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
