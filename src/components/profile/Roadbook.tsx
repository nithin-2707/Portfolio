"use client";

import { useRef } from "react";
import { roadbook, type RoadbookRow } from "@/content/site";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { Tulip } from "@/components/stages/Tulip";

/**
 * Profile as a printed rally roadbook. Every row is one instruction, read top to bottom like a co-driver's
 * sheet: the total distance (a year or a month) with the partial reading under it, the tulip in the middle box,
 * and the notes on the right. The first row is the start control, the last one is the road ahead.
 *
 * Motion: each row's exit is driven in route orange as the row reaches the reading line (once), the same grammar
 * as the Stages tulips. The server HTML is the finished sheet, so reduced motion and no-JS show it as printed.
 */

/** Start control: the dot you leave from and a pennant on a short mast. Same 120 box as the stage tulips. */
function StartTulip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false" className={className} data-tulip="">
      <path d="M60 103V40" className="stroke-current" strokeWidth={1.2} strokeLinecap="round" />
      <path data-tulip-exit="" d="M60 40V22" className="stroke-route" strokeWidth={3} strokeLinecap="round" />
      <path data-tulip-arrow="" d="M61.5 22H86L78 30.5L86 39H61.5Z" className="fill-route" />
      <circle cx="60" cy="103" r="3.6" className="fill-current" />
      <path d="M44 103H76" className="stroke-current" strokeOpacity={0.62} strokeWidth={0.9} strokeLinecap="round" />
    </svg>
  );
}

/** The road ahead: the approach runs on as a dashed line into an open arrowhead, a road not driven yet. */
function NextTulip({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" aria-hidden="true" focusable="false" className={className} data-tulip="">
      <path d="M60 103V72" className="stroke-current" strokeWidth={1.2} strokeLinecap="round" />
      {/* dashes are a road not driven yet, so they are never "drawn": only the arrowhead arrives */}
      <path d="M60 70V40" className="stroke-route" strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 8" />
      <path
        data-tulip-arrow=""
        d="M48.5 40.5L60 20.5L71.5 40.5"
        className="stroke-route"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="60" cy="103" r="3.6" className="fill-current" />
    </svg>
  );
}

function RowTulip({ turn }: { turn: RoadbookRow["turn"] }) {
  const cls = "size-full";
  if (turn === "start") return <StartTulip className={cls} />;
  if (turn === "next") return <NextTulip className={cls} />;
  return <Tulip turn={turn} className={cls} />;
}

const isMeasurement = (at: string) => /\d/.test(at);

export function Roadbook() {
  const ref = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const list = ref.current;
      if (!list) return;
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const rows = gsap.utils.toArray<HTMLElement>("[data-rb-row]", list);
        rows.forEach((row) => {
          const q = gsap.utils.selector(row);
          const exit = q("[data-tulip-exit]");
          const arrow = q("[data-tulip-arrow]");
          const text = q("[data-rb-text]");
          // lazy: false writes the resting state now, so no row flashes its finished tulip before it is driven
          const tl = gsap.timeline({ paused: true, defaults: { ease: "road", lazy: false } });
          tl.fromTo(q("[data-tulip]"), { opacity: 0.35 }, { opacity: 1, duration: 0.4 }, 0)
            .fromTo(exit, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, 0.1)
            .fromTo(exit, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5, ease: "steer" }, "<")
            .fromTo(arrow, { autoAlpha: 0, scale: 0.4, transformOrigin: "50% 50%" }, { autoAlpha: 1, scale: 1, duration: 0.3 }, "-=0.1")
            .fromTo(text, { autoAlpha: 0.25, x: 10 }, { autoAlpha: 1, x: 0, duration: 0.6, stagger: 0.05 }, 0.05);
          ScrollTrigger.create({ trigger: row, start: "top 78%", once: true, onEnter: () => void tl.play() });
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div>
      {/* the sheet's printed header: what each column means */}
      <div
        aria-hidden="true"
        className="grid grid-cols-[4.75rem_4.25rem_minmax(0,1fr)] border-b-2 border-ink pb-2 text-[0.75rem] font-medium tracking-[0.04em] text-venice sm:grid-cols-[5.5rem_5rem_minmax(0,1fr)]"
      >
        <span>Total</span>
        <span className="text-center">Direction</span>
        <span className="pl-4">Notes</span>
      </div>
      <ol ref={ref} aria-label="Roadbook: where I come from and where I went">
        {roadbook.map((row, i) => (
          <li
            key={row.at}
            data-rb-row=""
            className="group grid grid-cols-[4.75rem_4.25rem_minmax(0,1fr)] border-b border-paper-line sm:grid-cols-[5.5rem_5rem_minmax(0,1fr)]"
          >
            <div className="relative flex flex-col justify-center py-3.5 pr-2">
              <span aria-hidden="true" className="t-map absolute top-2 left-0 text-[0.625rem] text-ink/45">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={
                  isMeasurement(row.at)
                    ? "t-map mt-2 text-[0.9rem] leading-tight text-ink"
                    : "mt-2 font-display text-[0.95rem] font-semibold leading-tight tracking-[-0.01em] text-ink"
                }
              >
                {row.at}
              </span>
              {row.split ? (
                <span className={`mt-1 text-[0.75rem] leading-none ${/^SS/.test(row.split) ? "font-semibold text-venice" : "t-map text-ink/60"}`}>
                  {row.split}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-center border-x border-paper-line p-2 text-ink transition-colors duration-200 group-hover:bg-paper-deep/60">
              <span className="block size-full max-w-[4rem]">
                <RowTulip turn={row.turn} />
              </span>
            </div>
            <div className="min-w-0 py-3.5 pl-4">
              <p data-rb-text="" className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.005em] text-ink">
                {row.place}
              </p>
              <p data-rb-text="" className="mt-0.5 text-[0.9375rem] leading-snug text-ink/80">
                {row.note}
              </p>
              {row.detail ? (
                <p data-rb-text="" className="mt-1 text-[0.8125rem] leading-snug text-ink/65">
                  {row.detail}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
