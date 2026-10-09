"use client";

import { useRef } from "react";
import { signs } from "@/content/site";
import { gsap, useGSAP } from "@/lib/gsap";
import { readColors } from "@/lib/palette";

/**
 * The three-word beat. Each word stands beside the road sign that says what it means:
 * "Curious" a crossroads (every exit taken once), "careful" a hairpin (slow in, fast out),
 * "quick." the derestriction sign (the limit ends once the line is clear).
 *
 * Desktop with motion: the block pins and the words light one at a time as you scroll, each sign drawing its
 * symbol and its border turning route orange (the warning-sign red, in this map's ink). It ends with all three
 * lit. Elsewhere each row lights as it reaches the reading line. The server HTML is the finished, lit beat.
 */

type SignKind = (typeof signs)[number]["sign"];

const TRIANGLE = "M50 9.5C52.2 9.5 53.6 10.6 54.7 12.6L92.2 79.4C94.4 83.4 92.1 87.5 87.6 87.5H12.4C7.9 87.5 5.6 83.4 7.8 79.4L45.3 12.6C46.4 10.6 47.8 9.5 50 9.5Z";

function Sign({ kind }: { kind: SignKind }) {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" focusable="false" className="size-full overflow-visible">
      {kind === "derestricted" ? (
        <>
          <circle data-sign-border="" cx="50" cy="50" r="41" className="stroke-current" strokeWidth={6} />
          <path data-sign-symbol="" d="M25 75L75 25" className="stroke-current" strokeWidth={10} strokeLinecap="butt" />
          <path data-sign-symbol="" d="M31.5 81.5L81.5 31.5" className="stroke-current" strokeOpacity={0.35} strokeWidth={1.4} />
          <path data-sign-symbol="" d="M18.5 68.5L68.5 18.5" className="stroke-current" strokeOpacity={0.35} strokeWidth={1.4} />
        </>
      ) : (
        <>
          <path data-sign-border="" d={TRIANGLE} className="stroke-current" strokeWidth={6} strokeLinejoin="round" />
          {kind === "junction" ? (
            <>
              <path data-sign-symbol="" d="M50 77V35" className="stroke-current" strokeWidth={7} strokeLinecap="butt" />
              <path data-sign-symbol="" d="M33 58H67" className="stroke-current" strokeWidth={7} strokeLinecap="butt" />
            </>
          ) : (
            <>
              {/* a hairpin: up, round the tight bend, and back down the other side */}
              <path
                data-sign-symbol=""
                d="M41 78V52.5C41 46.5 45 42.5 50.5 42.5C56 42.5 60 46.5 60 52.5V63"
                className="stroke-current"
                strokeWidth={6.5}
                strokeLinecap="butt"
                strokeLinejoin="round"
              />
              <path data-sign-fill="" d="M52 61.5L60 74L68 61.5Z" className="fill-current" />
            </>
          )}
        </>
      )}
    </svg>
  );
}

export function RoadSigns() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const rows = gsap.utils.toArray<HTMLElement>("[data-sign-row]", root);
      const { route, ink } = readColors();

      const lightUp = (row: HTMLElement) => {
        const q = gsap.utils.selector(row);
        const tl = gsap.timeline({ defaults: { ease: "road" } });
        tl.to(q("[data-sign-word], [data-sign-line]"), { opacity: 1, duration: 0.5 }, 0)
          .to(q("[data-sign-glyph]"), { opacity: 1, duration: 0.3 }, 0)
          .fromTo(q("[data-sign-border]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.7, ease: "steer" }, 0)
          .to(q("[data-sign-border]"), { stroke: route, duration: 0.35 }, 0.45)
          .fromTo(q("[data-sign-symbol]"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.5, stagger: 0.08 }, 0.25)
          .fromTo(q("[data-sign-fill]"), { opacity: 0 }, { opacity: 1, duration: 0.25 }, 0.6);
        return tl;
      };
      const dimDown = (row: HTMLElement) => {
        const q = gsap.utils.selector(row);
        return gsap
          .timeline({ defaults: { ease: "road" } })
          .to(q("[data-sign-word], [data-sign-line]"), { opacity: 0.22, duration: 0.5 }, 0)
          .to(q("[data-sign-glyph]"), { opacity: 0.3, duration: 0.5 }, 0)
          .to(q("[data-sign-border]"), { stroke: ink, duration: 0.35 }, 0);
      };
      /** back to full strength without redrawing (the sign is already drawn) */
      const relight = (row: HTMLElement) => {
        const q = gsap.utils.selector(row);
        return gsap
          .timeline({ defaults: { ease: "road" } })
          .to(q("[data-sign-word], [data-sign-line]"), { opacity: 1, duration: 0.5 }, 0)
          .to(q("[data-sign-glyph]"), { opacity: 1, duration: 0.5 }, 0)
          .to(q("[data-sign-border]"), { stroke: route, duration: 0.35 }, 0);
      };
      const rest = () => {
        rows.forEach((row) => {
          const q = gsap.utils.selector(row);
          gsap.set(q("[data-sign-word], [data-sign-line]"), { opacity: 0.22 });
          gsap.set(q("[data-sign-glyph]"), { opacity: 0.3 });
        });
      };

      const mm = gsap.matchMedia();
      // pinned beat: needs room for all three rows in one screen
      mm.add("(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)", () => {
        rest();
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: { trigger: root, start: "center center", end: "+=140%", pin: true, scrub: true, anticipatePin: 1 },
        });
        rows.forEach((row, i) => {
          if (i > 0) tl.add(dimDown(rows[i - 1]), i);
          tl.add(lightUp(row), i);
        });
        // the sum: all three lit before the pin lets go
        tl.add(rows.slice(0, -1).map((row) => relight(row)), rows.length + 0.1);
        tl.to({}, { duration: 0.4 });
      });
      mm.add("(max-width: 1023px), (max-height: 619px)", () => {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
        rest();
        rows.forEach((row) => {
          const tl = lightUp(row).pause();
          gsap.timeline({ scrollTrigger: { trigger: row, start: "top 72%", once: true, onEnter: () => void tl.play() } });
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div ref={ref} data-signs="" className="border-y border-ink/15">
      <h3 className="sr-only">Three words</h3>
      <ul>
        {signs.map((s) => (
          <li
            key={s.word}
            data-sign-row=""
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-5 gap-y-3 border-b border-ink/10 py-[clamp(1rem,2.4vh,1.6rem)] last:border-b-0 md:grid-cols-[minmax(0,6fr)_5.5rem_minmax(0,4fr)] md:gap-x-[clamp(1.5rem,4vw,4rem)]"
          >
            <p
              data-sign-word=""
              className="font-display text-[clamp(2.4rem,8.2vw,7rem)] leading-[0.95] font-bold tracking-[-0.04em] text-ink"
            >
              {s.word}
            </p>
            <span data-sign-glyph="" className="block size-[clamp(3.25rem,6vw,5.5rem)] text-ink md:justify-self-center">
              <Sign kind={s.sign} />
            </span>
            <p
              data-sign-line=""
              className="col-span-2 max-w-[34ch] text-[clamp(1.0625rem,1.35vw,1.25rem)] leading-[1.45] text-ink/85 italic md:col-span-1"
            >
              {s.line}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
