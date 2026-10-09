"use client";

import { Fragment, useRef } from "react";
import { stages, type Stage } from "@/content/site";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { outlineFont } from "./outlineFont";
import { STAGES_TRACK_QUERY } from "./layout";
import { buildRoute, lengthAtX, type Bend, type RouteGeometry } from "./route";
import { Tulip } from "./Tulip";

/**
 * Stages: Venice-drenched, the one experience section. Each internship is a ruled roadbook sheet: the stage code,
 * the tulip, period and place, who and what, a one-line summary, three pace notes and the timing board.
 *
 * Desktop (STAGES_TRACK_QUERY): the section pins and scroll drives a road band along the bottom of the frame. The
 * band carries the three stage starts (SS1, SS2, SS3) and, after each, three pace-note ticks. Above it sits ONE
 * printed form whose ruling never moves: the three stages are stacked into it (a subgrid each, so every row is as
 * tall as its tallest entry) and only the stage the road is on shows. When the road reaches the next start, the
 * entries leave against the direction of travel and the next stage's arrive with it, in a short stagger, its tulip
 * drawing as it lands. Each pace note is called (its number fills in route orange) when the road passes its tick.
 * Scroll is the only input, and scrolling back reverses all of it. Hidden stages stay in the accessibility tree
 * (opacity only), so a screen reader reads all three in order.
 *
 * Everything else (phones, tablets, short screens, reduced motion, no JS) is a vertical roadbook column: one sheet
 * per stage beside a rail, each pace note called as it reaches the reading line. The server HTML is that column with
 * every note called; JS switches to the frame by setting data-layout="track".
 */

const MOTION_QUERY = "(prefers-reduced-motion: no-preference)";
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** scroll distance of the pinned drive, in screen heights */
const DRIVE_SCREENS = 2.85;
/** where each stage starts along the band (0 to 1) */
const STAGE_AT = [0.05, 0.37, 0.69];
/** where a stage's three pace notes are called, after its start */
const NOTE_AFTER = [0.07, 0.15, 0.23];
/** px from the top of the band down to the road's centre line */
const ROAD_Y = 22;
/** depth of the bend the road takes between one stage's last note and the next start */
const BEND = 11;

/** the printed form's cells, in the order an arriving stage fills them in */
const AREAS = ["code", "tulip", "head", "say", "notes", "meta", "board"] as const;

const AREAS_TRACK = `"code tulip head" "code tulip say" "code tulip notes" "code meta board"`;

const CSS = `
/* ── column: server HTML, phones, tablets, short screens, reduced motion ── */
.stg-box{display:grid;gap:1px;background:color-mix(in srgb,var(--color-paper) 22%,var(--color-venice));border:1px solid color-mix(in srgb,var(--color-paper) 25%,transparent);grid-template-columns:minmax(0,1fr) minmax(0,1.35fr);grid-template-areas:"tulip code" "meta meta" "head head" "say say" "notes notes" "board board"}
.stg-box>*{background:var(--color-venice);min-width:0}
@media (min-width:640px){.stg-box{grid-template-columns:minmax(8rem,26%) minmax(0,1fr);grid-template-areas:"tulip head" "tulip say" "code notes" "meta board"}}
.stg-c-code{grid-area:code}.stg-c-tulip{grid-area:tulip}.stg-c-meta{grid-area:meta}.stg-c-head{grid-area:head}.stg-c-say{grid-area:say}.stg-c-notes{grid-area:notes}.stg-c-board{grid-area:board}
.stg-paper,.stg-band{display:none}
.stg-reading+.stg-reading{border-left:1px solid color-mix(in srgb,var(--color-paper) 20%,transparent);padding-left:clamp(1rem,2vw,1.75rem)}
.stg-node-c.is-reached{background-color:var(--color-route);border-color:var(--color-route)}
/* when the page route runs the left lane through the column, it is the rail: the stage dots sit on it */
.stg[data-rail="route"] .stg-rail{display:none}
.stg[data-rail="route"] .stg-node-c{left:calc(var(--gutter) * -0.55 - 2.5rem - 6px)}

/* ── pace notes: called = the number filled in route orange (a clipped copy wipes across, so the digit changes ink
   exactly where the fill is); not yet called = an empty box and the line a step quieter. Only live layouts dim. ── */
.stg-note-n{position:relative;display:grid;place-items:center;flex:none;width:1.75rem;height:1.75rem;margin-top:-.05rem;border:1px solid color-mix(in srgb,var(--color-paper) 45%,transparent);border-radius:3px;font-weight:600;font-size:.8125rem;line-height:1;font-variant-numeric:tabular-nums}
.stg-note-lit{position:absolute;inset:-1px;display:grid;place-items:center;border-radius:3px;background:var(--color-route);color:var(--color-night);clip-path:inset(0 0 0 0);transition:clip-path .34s cubic-bezier(.23,1,.32,1)}
.stg-note-t{text-wrap:pretty;transition:opacity .3s cubic-bezier(.23,1,.32,1)}
.stg-c-say p,.stg-reading dd{text-wrap:balance}
.stg[data-notes="live"] .stg-note:not([data-lit]) .stg-note-lit{clip-path:inset(0 100% 0 0)}
.stg[data-notes="live"] .stg-note:not([data-lit]) .stg-note-t{opacity:.82}

/* ── desktop: the pinned frame ── */
.stg[data-layout="track"]{
  --stg-top:calc(4rem + clamp(.75rem,4vh - .75rem,2.5rem));
  --stg-band:4.75rem;
  --stg-pad:clamp(.8rem,1.85vh,1.45rem);
  --stg-fs-co:clamp(1.45rem,.55rem + 2vh,2.35rem);
  --stg-fs-role:clamp(.9rem,.62rem + .55vh,1.0625rem);
  --stg-fs-sum:clamp(1.05rem,.55rem + 1.15vh,1.45rem);
  --stg-fs-note:clamp(.9rem,.6rem + .62vh,1.0625rem);
  --stg-fs-num:clamp(2rem,.9rem + 2.7vh,3.4rem);
  --stg-fs-split:clamp(1.45rem,.75rem + 1.6vh,2.3rem);
  height:100svh;
  overflow:clip;
}
.stg[data-layout="track"] .stg-frame{height:100%;display:flex;flex-direction:column;justify-content:center;padding-top:var(--stg-top);padding-bottom:clamp(.5rem,2vh,1.5rem)}
.stg[data-layout="track"] .stg-head{flex:none;max-width:none;margin:0 0 clamp(.5rem,3vh - .6rem,1.75rem);display:grid;grid-template-columns:repeat(12,minmax(0,1fr));column-gap:1.5rem;align-items:end}
.stg[data-layout="track"] .stg-title{grid-column:1/span 6;font-size:clamp(2.2rem,.4rem + 4.8vh,4.2rem)}
.stg[data-layout="track"] .stg-head-deck{grid-column:7/span 6;display:flex;flex-wrap:wrap;align-items:end;justify-content:space-between;gap:.5rem 2rem}
.stg[data-layout="track"] .stg-deck{margin:0;font-size:clamp(1rem,.7rem + .75vh,1.25rem)}
.stg[data-layout="track"] .stg-legend{margin:0}
/* short screens give the legend's line to the sheet */
@media (max-height:800px){.stg[data-layout="track"] .stg-legend{display:none}}
.stg[data-layout="track"] .stg-body{flex:0 1 auto;min-height:0;max-width:none;display:flex;flex-direction:column}
.stg[data-layout="track"] .stg-rail,.stg[data-layout="track"] .stg-node-c{display:none}
.stg[data-layout="track"] .stg-form{display:grid;max-height:100%;padding:0;gap:1px;background:color-mix(in srgb,var(--color-paper) 22%,var(--color-venice));border:1px solid color-mix(in srgb,var(--color-paper) 25%,transparent);grid-template-columns:minmax(0,10fr) minmax(9.75rem,15fr) minmax(0,75fr);grid-template-rows:auto auto minmax(0,1fr) auto;grid-template-areas:${AREAS_TRACK}}
.stg[data-layout="track"] .stg-paper{display:block;background:var(--color-venice)}
.stg[data-layout="track"] .stg-list,.stg[data-layout="track"] .stg-item{display:contents}
.stg[data-layout="track"] .stg-box{grid-area:1/1/-1/-1;display:grid;grid-template-columns:subgrid;grid-template-rows:subgrid;grid-template-areas:${AREAS_TRACK};gap:1px;background:none;border:0}
.stg[data-layout="track"] .stg-box>*{background:none;overflow:clip}
.stg[data-layout="track"] .stg-box:not(.is-on){pointer-events:none;user-select:none}
.stg[data-layout="track"] .stg-c{padding:var(--stg-pad) calc(var(--stg-pad) * 1.3)}
.stg[data-layout="track"] .stg-c-code{padding:var(--stg-pad);container-type:size}
.stg[data-layout="track"] .stg-c-meta{padding-inline:var(--stg-pad)}
.stg[data-layout="track"] .stg-code{flex:1 1 auto;min-height:0;white-space:nowrap;writing-mode:vertical-rl;transform:rotate(180deg);font-size:min(26cqh,90cqw);line-height:.8}
.stg[data-layout="track"] .stg-tulip{max-width:11rem}
.stg[data-layout="track"] .stg-notes-list{gap:clamp(.55rem,1.3vh,.95rem)}
.stg[data-layout="track"] .stg-band{display:block;flex:none;width:100%;height:var(--stg-band);margin-top:clamp(.5rem,4.5vh - 1rem,2.75rem);overflow:visible}

/* ── the road band ── */
.stg-road{fill:none;stroke:var(--color-paper);stroke-opacity:.3;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.stg-road-driven{fill:none;stroke:var(--color-route);stroke-width:3;stroke-linecap:round;stroke-linejoin:round}
.stg-road-start{fill:var(--color-paper)}
.stg-road-end{fill:none;stroke:var(--color-paper);stroke-opacity:.45;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:stroke .3s cubic-bezier(.23,1,.32,1),stroke-opacity .3s}
.stg-road-end.is-reached{stroke:var(--color-route);stroke-opacity:1}
.stg-tip{fill:var(--color-route);stroke:var(--color-venice);stroke-width:2.5}
.stg-start line{stroke:var(--color-paper);stroke-opacity:.5;stroke-width:1.5}
.stg-start circle{fill:var(--color-venice);stroke:var(--color-paper);stroke-opacity:.6;stroke-width:1.5;transition:fill .3s cubic-bezier(.23,1,.32,1),stroke .3s cubic-bezier(.23,1,.32,1),stroke-opacity .3s}
.stg-start text{fill:var(--color-paper);fill-opacity:.82;transition:fill-opacity .3s}
.stg-start.is-reached circle{fill:var(--color-route);stroke:var(--color-route);stroke-opacity:1}
.stg-start.is-reached text{fill-opacity:.92}
.stg-start.is-current text{fill-opacity:1}
.stg-start-name{font-size:.8125rem;font-weight:500}
.stg-start-code{font-weight:700}
.stg-tick line{stroke:var(--color-paper);stroke-opacity:.45;stroke-width:1.5;stroke-linecap:round;transition:stroke .3s,stroke-opacity .3s}
.stg-tick text{fill:var(--color-paper);fill-opacity:.82;font-size:.6875rem;font-weight:600;font-variant-numeric:tabular-nums;transition:fill .3s,fill-opacity .3s}
.stg-tick.is-reached line{stroke:var(--color-route);stroke-opacity:1}
/* route orange is under 3:1 on Venice, so a passed number goes to full paper ink; the tick and the road carry the orange */
.stg-tick.is-reached text{fill-opacity:1}
`;

/**
 * One tulip, from rest to driven. Building the timeline applies the resting state at once: the junction (dot,
 * approach, stubs, ring) drawn at 35% opacity with the exit as a paper ghost. Playing it brings the diagram to full
 * strength and drives the exit in route orange over the ghost, then lands the arrowhead. The server HTML is the
 * finished diagram, so reduced motion and no-JS simply show that.
 */
function tulipTimeline(root: Element, lead = 0) {
  const q = gsap.utils.selector(root);
  const exit = q("[data-tulip-exit]");
  const ghost = q("[data-tulip-ghost]");
  // lazy: false writes every from-state synchronously while the timeline is built (GSAP's lazy first render left the
  // first exit line and arrowhead visible before their draw)
  const tl = gsap.timeline({ paused: true, defaults: { ease: "road", lazy: false } });
  tl.fromTo(q("[data-tulip]"), { opacity: 0.35 }, { opacity: 1, duration: 0.45 }, lead);
  // round caps render a dot even at 0% length, so the exit stays hidden until its draw begins
  tl.fromTo(exit, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, lead + 0.12);
  tl.fromTo(exit, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.55, ease: "steer" }, "<");
  tl.fromTo(
    q("[data-tulip-arrow]"),
    { scale: 0.35, autoAlpha: 0, transformOrigin: "50% 50%" },
    { scale: 1, autoAlpha: 1, duration: 0.3 },
    "-=0.1",
  );
  // once the orange covers the ghost exactly it retires, so its antialiased edge never fringes the stroke
  tl.fromTo(ghost, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.2 }, "-=0.05");
  return tl;
}

/** A pace note's text, with **figures** set in bold and a number-word pair ("12-hour") never split across lines. */
function NoteText({ text }: { text: string }) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-paper">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>
        {part.split(/(\d+-\w+)/g).map((bit, j) =>
          j % 2 ? (
            <span key={j} className="whitespace-nowrap">
              {bit}
            </span>
          ) : (
            bit
          ),
        )}
      </Fragment>
    ),
  );
}

function Legend() {
  return (
    <p
      aria-hidden="true"
      className="stg-legend mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[0.8125rem] leading-5 text-paper/80"
    >
      <span className="inline-flex items-center gap-2.5">
        <svg viewBox="0 0 20 20" className="size-5 shrink-0" fill="none">
          <path d="M10 15V4" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
          <circle cx="10" cy="15.5" r="2.8" className="fill-current" />
        </svg>
        Where I came from
      </span>
      <span className="inline-flex items-center gap-2.5">
        <svg viewBox="0 0 20 20" className="size-5 shrink-0" fill="none">
          <path d="M2.5 10H11.5" className="stroke-route" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M10.5 5.6 17.5 10l-7 4.4Z" className="fill-route" />
        </svg>
        Where I went
      </span>
    </p>
  );
}

function StageItem({ stage }: { stage: Stage }) {
  const titleId = `stage-${stage.code.toLowerCase()}-title`;
  const notesId = `stage-${stage.code.toLowerCase()}-notes`;
  return (
    <li className="stg-item relative">
      <span
        aria-hidden="true"
        className="stg-node-c absolute left-[-33.5px] top-8 size-3 rounded-full border border-paper/60 bg-venice transition-colors duration-300"
      />
      {/* each cell holds one [data-move] block: the cell stays put with the ruling, the block is what travels */}
      <article data-stage-box="" aria-labelledby={titleId} className="stg-box">
        <div data-cell="code" className="stg-c stg-c-code @container flex flex-col p-4 sm:p-5">
          <div data-move="" className="flex min-h-0 flex-1 flex-col">
            <p
              className={`stg-code ${outlineFont.className} text-[length:31cqw] leading-[0.8] tracking-[-0.02em] text-transparent [-webkit-text-stroke:1px_var(--color-paper)]`}
            >
              {stage.code}
            </p>
          </div>
        </div>

        <div data-cell="tulip" className="stg-c stg-c-tulip flex items-center justify-center p-4 sm:p-5">
          <div data-move="" className="flex w-full justify-center">
            <Tulip turn={stage.turn} className="stg-tulip aspect-square w-full max-w-[8.5rem] sm:max-w-[9.5rem]" />
          </div>
        </div>

        <div data-cell="meta" className="stg-c stg-c-meta px-4 py-3.5 sm:px-5">
          <div data-move="">
            <p className="t-map leading-[1.5] text-paper/85">{stage.period}</p>
            <p className="mt-1 text-[0.875rem] leading-snug text-paper/85">{stage.place}</p>
          </div>
        </div>

        <div data-cell="head" className="stg-c stg-c-head px-5 pt-5 pb-4 sm:px-7 sm:pt-6">
          <div data-move="">
            <h3
              id={titleId}
              className="font-display text-[length:var(--stg-fs-co,clamp(1.35rem,4.6vw,1.9rem))] leading-[1.02] font-semibold tracking-[-0.025em]"
            >
              {stage.company}
            </h3>
            <p className="mt-2 text-[length:var(--stg-fs-role,1rem)] leading-snug font-medium text-paper/85">{stage.role}</p>
          </div>
        </div>

        <div data-cell="say" className="stg-c stg-c-say flex flex-col justify-center px-5 py-5 sm:px-7 sm:py-6">
          <p
            data-move=""
            className="max-w-[44ch] text-[length:var(--stg-fs-sum,clamp(1.2rem,4.2vw,1.45rem))] leading-[1.3] tracking-[-0.01em] text-paper italic"
          >
            {stage.summary}
          </p>
        </div>

        <div data-cell="notes" className="stg-c stg-c-notes px-5 py-5 sm:px-7 sm:py-6">
          <div data-move="">
            <h4 id={notesId} className="text-[0.75rem] leading-none font-medium text-paper/80">
              Pace notes
            </h4>
            <ol aria-labelledby={notesId} className="stg-notes-list mt-3.5 grid gap-3.5">
              {stage.notes.map((note, i) => (
                <li key={note} data-note="" className="stg-note flex items-start gap-3.5">
                  <span aria-hidden="true" className="stg-note-n">
                    {i + 1}
                    <span className="stg-note-lit">{i + 1}</span>
                  </span>
                  <p className="stg-note-t max-w-[68ch] text-[length:var(--stg-fs-note,1rem)] leading-[1.5] text-paper">
                    <NoteText text={note} />
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* the timing board: real readings on the left, the kit that ran the stage on the right */}
        <div data-cell="board" className="stg-c stg-c-board px-5 py-5 sm:px-7">
          <div data-move="" className="grid items-end gap-x-[clamp(1.5rem,3vw,2.5rem)] gap-y-5 lg:grid-cols-[auto_minmax(0,1fr)]">
            <dl className="flex min-w-0 flex-wrap items-start gap-y-4">
              <div className="stg-reading shrink-0">
                <dt className="text-[0.75rem] leading-none font-medium text-paper/80">Stage result</dt>
                <dd className="mt-2.5 font-display text-[length:var(--stg-fs-num,clamp(2.4rem,9vw,3.2rem))] leading-[0.85] font-bold tracking-[-0.04em] text-paper">
                  {stage.result.value}
                </dd>
                <dd className="mt-2 max-w-[19ch] text-[0.8125rem] leading-snug text-paper/85">{stage.result.label}</dd>
              </div>
              {stage.split ? (
                <div className="stg-reading shrink-0">
                  <dt className="text-[0.75rem] leading-none font-medium text-paper/80">Split</dt>
                  <dd className="mt-2.5 font-display text-[length:var(--stg-fs-split,clamp(1.7rem,6vw,2.2rem))] leading-[0.85] font-bold tracking-[-0.035em] text-paper">
                    {stage.split.value}
                  </dd>
                  <dd className="mt-2 max-w-[19ch] text-[0.8125rem] leading-snug text-paper/85">{stage.split.label}</dd>
                </div>
              ) : null}
            </dl>
            <ul
              aria-label={`Kit at ${stage.company}`}
              className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[0.875rem] leading-6 text-paper/80 lg:pb-0.5"
            >
              <li aria-hidden="true" className="mr-1 font-semibold text-paper">
                Kit
              </li>
              {stage.tools.map((tool, i) => (
                <li key={tool} className="flex items-center gap-3.5">
                  {tool}
                  {i < stage.tools.length - 1 ? <span aria-hidden="true" className="size-[3px] rounded-full bg-paper/50" /> : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </article>
    </li>
  );
}

/** the point on the route at arc length `len` (the route is a dense polyline) */
function pointAt(geo: RouteGeometry, len: number): [number, number] {
  const { xs, ys, cum } = geo;
  if (len <= 0) return [xs[0], ys[0]];
  const last = xs.length - 1;
  if (len >= cum[last]) return [xs[last], ys[last]];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] <= len) lo = mid;
    else hi = mid;
  }
  const t = (len - cum[lo]) / (cum[hi] - cum[lo] || 1);
  return [xs[lo] + (xs[hi] - xs[lo]) * t, ys[lo] + (ys[hi] - ys[lo]) * t];
}

export function Stages() {
  const sectionRef = useRef<HTMLElement>(null);
  const listWrapRef = useRef<HTMLDivElement>(null);
  const railFillRef = useRef<HTMLSpanElement>(null);
  const bandRef = useRef<SVGSVGElement>(null);
  const roadRef = useRef<SVGPathElement>(null);
  const drivenRef = useRef<SVGPathElement>(null);
  const startRef = useRef<SVGCircleElement>(null);
  const tipRef = useRef<SVGCircleElement>(null);
  const endRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      const listWrap = listWrapRef.current;
      const railFill = railFillRef.current;
      const band = bandRef.current;
      const road = roadRef.current;
      const driven = drivenRef.current;
      const startDot = startRef.current;
      const tip = tipRef.current;
      const endMark = endRef.current;
      if (!section || !listWrap || !railFill || !band || !road || !driven || !startDot || !tip || !endMark) return;

      const boxes = gsap.utils.toArray<HTMLElement>("[data-stage-box]", section);
      const notesOf = boxes.map((box) => gsap.utils.toArray<HTMLElement>("[data-note]", box));
      const allNotes = notesOf.flat();
      const clearNotes = () => {
        delete section.dataset.notes;
        allNotes.forEach((n) => n.removeAttribute("data-lit"));
      };

      /* ── desktop: the pinned frame, driven by the road band ───────────── */
      const setupTrack = () => {
        section.dataset.layout = "track";
        section.dataset.notes = "live";

        // the arriving order: code, tulip, head, say, notes, meta, board
        const movesOf = boxes.map((box) =>
          AREAS.map((a) => box.querySelector<HTMLElement>(`[data-cell="${a}"] > [data-move]`)).filter(
            (el): el is HTMLElement => el !== null,
          ),
        );
        const tulips = boxes.map((box) => tulipTimeline(box, 0.12));
        const starts = gsap.utils.toArray<SVGGElement>("[data-band-stage]", band);
        const ticks = gsap.utils.toArray<SVGGElement>("[data-band-note]", band);

        let geo: RouteGeometry = buildRoute({ start: 0, end: 1, base: ROAD_Y, bends: [] });
        let x0 = 0;
        let x1 = 1;
        let startXs: number[] = [];
        let tickXs: number[] = [];
        let active = -1;
        const lit = boxes.map(() => -1);
        let progress = 0;

        const layout = () => {
          const w = band.clientWidth;
          if (!w) return;
          x0 = 5;
          x1 = w - 4;
          const at = (p: number) => x0 + p * (x1 - x0);
          startXs = STAGE_AT.map(at);
          tickXs = STAGE_AT.flatMap((s) => NOTE_AFTER.map((n) => at(s + n)));
          // the road bends once in each run between a stage's last note and the next start, alternating up and down
          const bends: Bend[] = STAGE_AT.slice(1).map((s, i) => ({
            a: at(STAGE_AT[i] + NOTE_AFTER[NOTE_AFTER.length - 1]) + 16,
            b: at(s) - 16,
            amp: i % 2 === 0 ? -BEND : BEND,
          }));
          geo = buildRoute({ start: x0, end: x1 - 3, base: ROAD_Y, bends });
          road.setAttribute("d", geo.d);
          driven.setAttribute("d", geo.d);
          startDot.setAttribute("cx", x0.toFixed(1));
          startDot.setAttribute("cy", String(ROAD_Y));
          endMark.setAttribute("transform", `translate(${x1.toFixed(1)} ${ROAD_Y})`);
          starts.forEach((g, i) => g.setAttribute("transform", `translate(${startXs[i].toFixed(1)} ${ROAD_Y})`));
          ticks.forEach((t, k) => t.setAttribute("transform", `translate(${tickXs[k].toFixed(1)} ${ROAD_Y})`));
        };

        /** the road band follows scroll 1:1 (Lenis already smooths it) */
        const paintRoad = (p: number) => {
          const x = x0 + p * (x1 - x0);
          const len = lengthAtX(geo, x);
          driven.style.strokeDasharray = `${len.toFixed(1)} ${(geo.length + 20).toFixed(1)}`;
          const [tx, ty] = pointAt(geo, len);
          tip.setAttribute("cx", tx.toFixed(1));
          tip.setAttribute("cy", ty.toFixed(1));
          starts.forEach((g, i) => g.classList.toggle("is-reached", startXs[i] <= x + 0.5));
          ticks.forEach((t, k) => t.classList.toggle("is-reached", tickXs[k] <= x + 0.5));
          endMark.classList.toggle("is-reached", x >= x1 - 1);
        };

        const isCode = (el: Element) => el.parentElement?.dataset.cell === "code";

        /**
         * Show stage `next`. Leaving entries go fast, against the direction of travel (the code drum rolls on, the
         * rest drift back); arriving ones come with it in a short stagger. Every tween starts from the element's live
         * value, so a quick reversal mid-change simply turns round.
         */
        const showStage = (next: number, dir: number, immediate: boolean) => {
          const prev = active;
          active = next;
          boxes.forEach((box, i) => box.classList.toggle("is-on", i === next));
          starts.forEach((g, i) => g.classList.toggle("is-current", i === next));

          if (immediate) {
            boxes.forEach((_, i) => {
              gsap.set(movesOf[i], { opacity: i === next ? 1 : 0, x: 0, y: 0 });
              tulips[i].pause().progress(i === next ? 1 : 0);
            });
            return;
          }

          if (prev >= 0 && prev !== next) {
            tulips[prev].pause();
            gsap.to(movesOf[prev], {
              opacity: 0,
              x: (_: number, el: Element) => (isCode(el) ? 0 : -dir * 18),
              y: (_: number, el: Element) => (isCode(el) ? -dir * 44 : 0),
              duration: 0.2,
              ease: "power2.out",
              overwrite: true,
            });
          }
          movesOf[next].forEach((el, k) => {
            if (Number(gsap.getProperty(el, "opacity")) < 0.05) {
              gsap.set(el, isCode(el) ? { x: 0, y: dir * 44 } : { x: dir * 26, y: 0 });
            }
            gsap.to(el, { opacity: 1, x: 0, y: 0, duration: 0.5, ease: "road", delay: 0.07 + k * 0.035, overwrite: true });
          });
          tulips[next].restart(true);
        };

        const update = (p: number, immediate = false) => {
          progress = p;
          paintRoad(p);
          let s = 0;
          STAGE_AT.forEach((at, i) => {
            if (p >= at) s = i;
          });
          if (s !== active) showStage(s, s > active ? 1 : -1, immediate || active < 0);
          boxes.forEach((_, i) => {
            const n = i < s ? 3 : i > s ? 0 : NOTE_AFTER.filter((o) => p >= STAGE_AT[i] + o).length;
            if (n === lit[i]) return;
            lit[i] = n;
            notesOf[i].forEach((el, j) => el.toggleAttribute("data-lit", j < n));
          });
        };

        layout();
        const st = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * DRIVE_SCREENS)}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => update(self.progress),
          onRefresh: (self) => {
            layout();
            update(self.progress, true);
          },
        });
        update(st.progress, true);

        // a resize that changes no scroll positions still changes the band's width
        const ro = new ResizeObserver(() => {
          layout();
          paintRoad(progress);
        });
        ro.observe(band);

        return () => {
          ro.disconnect();
          [...starts, ...ticks, endMark].forEach((el) => el.classList.remove("is-reached", "is-current"));
          boxes.forEach((box) => box.classList.remove("is-on"));
          driven.style.strokeDasharray = "";
          clearNotes();
          delete section.dataset.layout;
        };
      };

      /* ── phones, tablets, short screens: the vertical roadbook ────────── */
      const setupColumn = () => {
        section.dataset.notes = "live";
        section.dataset.rail = "route";
        boxes.forEach((box) => {
          const draw = tulipTimeline(box, 0.35);
          gsap.fromTo(
            box,
            { clipPath: "inset(0% 100% 0% 0%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              duration: 1.1,
              ease: "road",
              scrollTrigger: { trigger: box, start: "top 86%", once: true },
              onStart: () => {
                draw.play();
              },
            },
          );
        });

        // each pace note is called as it reaches the reading line, and uncalled if you scroll back above it
        allNotes.forEach((note) => {
          ScrollTrigger.create({
            trigger: note,
            start: "center 72%",
            onEnter: () => note.setAttribute("data-lit", ""),
            onLeaveBack: () => note.removeAttribute("data-lit"),
          });
        });

        gsap.fromTo(
          railFill,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: { trigger: listWrap, start: "top 70%", end: "bottom 70%", scrub: true },
          },
        );

        const columnNodes = gsap.utils.toArray<HTMLElement>(".stg-node-c", section);
        columnNodes.forEach((node) => {
          ScrollTrigger.create({
            trigger: node,
            start: "center 70%",
            onEnter: () => node.classList.add("is-reached"),
            onLeaveBack: () => node.classList.remove("is-reached"),
          });
        });

        return () => {
          columnNodes.forEach((node) => node.classList.remove("is-reached"));
          clearNotes();
          delete section.dataset.rail;
        };
      };

      /* ── reduced motion: keep the fades, drop the travel; every note stays called ── */
      const setupReduced = () => {
        section.dataset.rail = "route";
        boxes.forEach((box) => {
          gsap.from(box, {
            autoAlpha: 0,
            duration: 0.6,
            ease: "road",
            scrollTrigger: { trigger: box, start: "top 88%", once: true },
          });
        });
        return () => {
          delete section.dataset.rail;
        };
      };

      const mm = gsap.matchMedia();
      mm.add({ track: STAGES_TRACK_QUERY, motion: MOTION_QUERY, reduce: REDUCE_QUERY }, (ctx) => {
        const { track: isTrack, motion } = ctx.conditions as { track: boolean; motion: boolean; reduce: boolean };
        if (isTrack) return setupTrack();
        if (motion) return setupColumn();
        return setupReduced();
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      ref={sectionRef}
      id="stages"
      aria-labelledby="stages-title"
      data-waypoint="stages"
      data-nav-tone="dark"
      className="stg relative bg-venice text-paper"
    >
      <style href="stages-layout" precedence="medium">
        {CSS}
      </style>

      <div className="stg-frame mx-auto max-w-[var(--container-route)] px-[var(--gutter)] py-[var(--section-y)]">
        <header className="stg-head mb-[clamp(3rem,7vw,5rem)] max-w-[36rem]">
          <h2
            id="stages-title"
            className="stg-title font-display text-[clamp(2.6rem,6vw,5.2rem)] font-bold leading-[0.95] tracking-[-0.035em]"
          >
            Stages
          </h2>
          <div className="stg-head-deck">
            <p className="stg-deck mt-6 max-w-[30ch] text-[clamp(1.05rem,1.4vw,1.3rem)] leading-[1.45] text-paper/85">
              Three internships, one direction: closer to the model and closer to the user.
            </p>
            <Legend />
          </div>
        </header>

        <div ref={listWrapRef} className="stg-body relative lg:max-w-[64rem]">
          <span aria-hidden="true" className="stg-rail pointer-events-none absolute top-0 bottom-0 left-3 w-px bg-paper/25">
            <span ref={railFillRef} className="absolute inset-y-0 left-[-0.5px] w-0.5 origin-top scale-y-0 bg-route" />
          </span>
          <div className="stg-form pl-10">
            {/* the printed form: one blank cell per area, so the ruling stays still while the entries change */}
            {AREAS.map((a) => (
              <span key={a} aria-hidden="true" className="stg-paper" style={{ gridArea: a }} />
            ))}
            <ol className="stg-list grid gap-[clamp(2.5rem,7vw,4rem)]">
              {stages.map((stage) => (
                <StageItem key={stage.code} stage={stage} />
              ))}
            </ol>
          </div>
        </div>

        <svg ref={bandRef} className="stg-band" aria-hidden="true" focusable="false">
          <path ref={roadRef} className="stg-road" />
          <path ref={drivenRef} className="stg-road-driven" />
          <circle ref={startRef} className="stg-road-start" r="4.5" cx="0" cy={ROAD_Y} />
          {stages.flatMap((stage) =>
            stage.notes.map((note, j) => (
              <g key={note} data-band-note="" className="stg-tick">
                <line x1="0" x2="0" y1="-5" y2="5" />
                <text y="-10" textAnchor="middle">
                  {j + 1}
                </text>
              </g>
            )),
          )}
          {stages.map((stage) => (
            <g key={stage.code} data-band-stage="" className="stg-start">
              <line x1="0" x2="0" y1="-11" y2="11" />
              <circle r="5.5" />
              <text x="-5" y="29" className="stg-start-name">
                <tspan className="stg-start-code">{stage.code}</tspan> {stage.company}
              </text>
              <text x="-5" y="46" className="t-map">
                {stage.period}
              </text>
            </g>
          ))}
          <path ref={endRef} className="stg-road-end" d="M-8 -7L2 0L-8 7" />
          <circle ref={tipRef} className="stg-tip" r="5" cx="0" cy={ROAD_Y} />
        </svg>
      </div>
    </section>
  );
}
