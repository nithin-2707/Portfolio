"use client";

import { useRef } from "react";
import { phases } from "@/content/site";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { outlineFont } from "@/components/stages/outlineFont";

/**
 * Service park (paper): how I work, as the four service bays a rally crew runs at every stage. Stages above says
 * where I went and what I did; this says how.
 *
 * Desktop (BAYS_QUERY): the section pins and scroll is the only input. Bay 1 stands open; as you scroll, the next bay
 * opens and the last one folds into a narrow numbered tab (the AccordionGallery grammar, driven by scroll instead of
 * hover), and scrolling back reverses it. The open bay is drenched in Venice; a route-orange bar along its top edge
 * fills as you drive through that phase, and stays full on the bays already done. Content keeps its open width while
 * a bay grows, so text never reflows mid-motion. Folded bays stay in the accessibility tree (opacity only).
 *
 * Everything else (phones, tablets, short screens, reduced motion, no JS): the four bays stacked and open, each bar
 * filling as its bay reaches the reading line; reduced motion and no JS show every bar full.
 */

const BAYS_QUERY = "(min-width: 1024px) and (min-height: 620px) and (prefers-reduced-motion: no-preference)";
const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
/** scroll distance of the pinned drive, in screen heights */
const DRIVE_SCREENS = 1.9;
/** width of a folded bay, in rem */
const FOLDED_REM = 5.5;

const CSS = `
/* ── column: server HTML, phones, tablets, short screens, reduced motion ── */
.svp-bays{display:grid;gap:clamp(.75rem,1.6vw,1rem)}
@media (min-width:768px){.svp-bays{grid-template-columns:repeat(2,minmax(0,1fr))}}
.svp-bay{position:relative;border:1px solid var(--color-paper-line);background:var(--color-paper);min-width:0}
.svp-bar{position:absolute;left:-1px;right:-1px;top:-1px;height:3px;background:var(--color-route);transform-origin:0 50%}
.svp-tab{display:none}
.svp-body{padding:clamp(1.25rem,3vw,2rem)}
.svp-n{font-size:3.25rem;line-height:.8;color:transparent;-webkit-text-stroke:1px var(--color-ink)}
.svp-log{border-top:1px solid var(--color-paper-line)}
.svp-name{font-size:clamp(1.75rem,1rem + 1.8vw,2.75rem)}
.svp-motto{font-size:clamp(1.15rem,1rem + .4vw,1.4rem)}

/* ── desktop: the pinned row of bays ── */
.svp[data-layout="bays"]{height:100svh;overflow:clip}
.svp[data-layout="bays"] .svp-frame{height:100%;display:flex;flex-direction:column;justify-content:center;padding-top:calc(4rem + clamp(.75rem,4vh - .75rem,2.5rem));padding-bottom:clamp(1.5rem,5vh,3.5rem)}
.svp[data-layout="bays"] .svp-bays{display:flex;gap:.75rem;height:clamp(18rem,48vh,28rem);margin-top:clamp(1.5rem,5vh,3.5rem)}
.svp[data-layout="bays"] .svp-bay{flex:1 1 0;overflow:clip;transition:background-color .45s cubic-bezier(.23,1,.32,1),border-color .45s cubic-bezier(.23,1,.32,1),color .45s cubic-bezier(.23,1,.32,1)}
.svp[data-layout="bays"] .svp-bay.is-open{background:var(--color-venice);border-color:var(--color-venice);color:var(--color-paper)}
.svp[data-layout="bays"] .svp-tab{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;align-items:center;padding:1.25rem 0 1.5rem}
.svp[data-layout="bays"] .svp-tab-name{writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;font-weight:600;font-size:1rem;letter-spacing:.01em}
.svp[data-layout="bays"] .svp-body{position:absolute;top:0;left:0;bottom:0;width:var(--svp-open,40rem);padding:clamp(1.5rem,3.6vh,2.5rem) clamp(1.5rem,2.6vw,2.75rem);container-type:inline-size;display:flex;flex-direction:column}
.svp[data-layout="bays"] .svp-body .svp-n{-webkit-text-stroke-color:var(--color-paper);font-size:clamp(3.5rem,1rem + 6vh,5.5rem)}
.svp[data-layout="bays"] .svp-log{border-top-color:color-mix(in srgb,var(--color-paper) 25%,transparent)}
.svp[data-layout="bays"] .svp-bay:not(.is-open) .svp-body{pointer-events:none;user-select:none}
/* wide open bays read as a board: number and name on the left, the words on the right */
.svp[data-layout="bays"] .svp-sign{flex:1 1 auto;justify-content:space-between}
.svp[data-layout="bays"] .svp-name{margin-top:0}
@container (min-width:44rem){
  .svp-grid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);column-gap:clamp(2rem,4vw,3.5rem);align-items:stretch;flex:1}
  .svp-words{align-self:end}
}
`;

export function ServicePark() {
  const sectionRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLOListElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const list = listRef.current;
      if (!section || !list) return;
      const bays = gsap.utils.toArray<HTMLElement>("[data-bay]", list);
      const bars = bays.map((b) => b.querySelector<HTMLElement>("[data-bar]"));
      const tabs = bays.map((b) => b.querySelector<HTMLElement>("[data-tab]"));
      const partsOf = bays.map((b) => gsap.utils.toArray<HTMLElement>("[data-part]", b));

      /* ── desktop: one bay open at a time, opened by scroll ── */
      const setupBays = () => {
        section.dataset.layout = "bays";
        let active = -1;
        let grow = 8;

        const measure = () => {
          const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
          const folded = FOLDED_REM * rem;
          const gap = parseFloat(getComputedStyle(list).columnGap) || 12;
          const open = Math.max(folded * 2, list.clientWidth - gap * (bays.length - 1) - folded * (bays.length - 1));
          list.style.setProperty("--svp-open", `${Math.round(open)}px`);
          grow = open / folded;
        };

        /** open bay `next`; every tween starts from the live value, so a quick reversal simply turns round */
        const open = (next: number, animate: boolean) => {
          active = next;
          bays.forEach((bay, i) => {
            const isOpen = i === next;
            bay.classList.toggle("is-open", isOpen);
            gsap.to(bay, { flexGrow: isOpen ? grow : 1, duration: animate ? 0.7 : 0, ease: "steer", overwrite: "auto" });
            const tab = tabs[i];
            if (tab) {
              gsap.to(tab, {
                opacity: isOpen ? 0 : 1,
                duration: animate ? (isOpen ? 0.15 : 0.3) : 0,
                delay: animate && !isOpen ? 0.3 : 0,
                ease: "road",
                overwrite: "auto",
              });
            }
            if (isOpen) {
              partsOf[i].forEach((el, k) => {
                if (animate && Number(gsap.getProperty(el, "opacity")) < 0.05) gsap.set(el, { y: 14 });
                gsap.to(el, {
                  opacity: 1,
                  y: 0,
                  duration: animate ? 0.5 : 0,
                  delay: animate ? 0.3 + k * 0.05 : 0,
                  ease: "road",
                  overwrite: "auto",
                });
              });
            } else {
              gsap.to(partsOf[i], { opacity: 0, y: 0, duration: animate ? 0.15 : 0, ease: "road", overwrite: "auto" });
            }
          });
        };

        /** the bars: done bays full, the open bay filling with the drive through it, bays ahead empty */
        const fill = (p: number) => {
          bars.forEach((bar, i) => {
            if (bar) gsap.set(bar, { scaleX: gsap.utils.clamp(0, 1, p * bays.length - i) });
          });
        };

        const update = (p: number, animate: boolean) => {
          const next = Math.min(bays.length - 1, Math.floor(p * bays.length));
          if (next !== active) open(next, animate && active >= 0);
          fill(p);
        };

        measure();
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * DRIVE_SCREENS)}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => update(self.progress, true),
          onRefresh: (self) => {
            measure();
            active = -1;
            update(self.progress, false);
          },
        });
        update(st.progress, false);

        const ro = new ResizeObserver(() => {
          measure();
          const now = active;
          active = -1;
          open(now < 0 ? 0 : now, false);
        });
        ro.observe(list);

        return () => {
          ro.disconnect();
          bays.forEach((bay) => bay.classList.remove("is-open"));
          list.style.removeProperty("--svp-open");
          delete section.dataset.layout;
        };
      };

      /* ── phones, tablets, short screens: every bay open, each bar filling at the reading line ── */
      const setupColumn = () => {
        bays.forEach((bay, i) => {
          const bar = bars[i];
          if (!bar) return;
          gsap.set(bar, { scaleX: 0 });
          ScrollTrigger.create({
            trigger: bay,
            start: "top 75%",
            onEnter: () => gsap.to(bar, { scaleX: 1, duration: 0.6, ease: "road", overwrite: "auto" }),
            onLeaveBack: () => gsap.to(bar, { scaleX: 0, duration: 0.3, ease: "road", overwrite: "auto" }),
          });
        });
      };

      const mm = gsap.matchMedia();
      mm.add({ bays: BAYS_QUERY, motion: MOTION_QUERY }, (ctx) => {
        const { bays: isBays, motion } = ctx.conditions as { bays: boolean; motion: boolean };
        if (isBays) return setupBays();
        if (motion) setupColumn();
        return undefined;
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="service-park"
      aria-labelledby="service-park-title"
      data-waypoint="service-park"
      className="svp relative bg-paper text-ink"
    >
      <style href="service-park-layout" precedence="medium">
        {CSS}
      </style>

      <div className="svp-frame mx-auto max-w-[var(--container-route)] px-[var(--gutter)] py-[var(--section-y)]">
        <header className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-6">
          <h2 id="service-park-title" className="t-heading text-ink lg:col-span-7">
            Service park
          </h2>
          <p className="max-w-[34ch] text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug text-ink/80 lg:col-span-4 lg:col-start-9 lg:pb-1">
            How I work: four phases, and round again at every stage.
          </p>
        </header>

        <ol ref={listRef} className="svp-bays mt-[clamp(2.5rem,6vw,4.5rem)]" aria-label="How I work, in four phases">
          {phases.map((phase, i) => (
            <li key={phase.id} data-bay="" className="svp-bay">
              <span data-bar="" aria-hidden="true" className="svp-bar" />

              {/* the folded bay: its number and name, read bottom to top like a map's margin label */}
              <div data-tab="" aria-hidden="true" className="svp-tab">
                <span className={`${outlineFont.className} svp-n !text-[2.25rem]`}>{i + 1}</span>
                <span className="svp-tab-name">{phase.name}</span>
              </div>

              <div className="svp-body">
                <div className="svp-grid flex flex-1 flex-col justify-between gap-6">
                  <div data-part="" className="svp-sign flex flex-col">
                    <p aria-hidden="true" className={`${outlineFont.className} svp-n`}>
                      {i + 1}
                    </p>
                    <h3 className="svp-name mt-4 font-display leading-[1] font-bold tracking-[-0.03em]">
                      {phase.name}
                    </h3>
                  </div>
                  <div className="svp-words grid gap-4">
                    <p data-part="" className="svp-motto leading-snug italic">
                      {phase.motto}
                    </p>
                    <p data-part="" className="max-w-[52ch] text-[1.0625rem] leading-[1.55] opacity-90 [text-wrap:pretty]">
                      {phase.how}
                    </p>
                    <p data-part="" className="svp-log max-w-[52ch] pt-4 text-[0.9375rem] leading-[1.5] [text-wrap:pretty]">
                      <span className="mr-2 font-semibold">Logbook</span>
                      <span className="opacity-90">{phase.proof}</span>
                    </p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
