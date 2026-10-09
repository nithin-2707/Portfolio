"use client";

import { useGSAP, gsap, ScrollTrigger } from "@/lib/gsap";
import { STAGES_TRACK_QUERY } from "@/components/stages/layout";

/**
 * One orange route down the whole page. Each section carries one "leg" of it: a road that enters at the top in a
 * lane (just inside the container's left or right gutter), may change lanes in an empty band, joins the section's
 * own road (the stage profile's axis, the Stages road band, the Side roads junction) and leaves at the bottom in the
 * lane where the next section picks it up. Together the legs read as one road; the Finish's chequered line ends it.
 *
 * Every leg draws itself as you scroll: its tip sits on the reading line (70% down the screen) and carries a small
 * waypoint dot. Geometry is measured in real pixels after every ScrollTrigger refresh (pins included), so strokes
 * never distort and anchors stay exact. Reduced motion: every leg is simply drawn. No JS: no route (it is decoration;
 * every section reads on its own).
 */

const NS = "http://www.w3.org/2000/svg";
const LINE = 0.7;

type Lane = "left" | "right";
/** a point of the leg: a lane at a y (section top/bottom, px, or an element's edge), or an element's centre */
type PointSpec =
  | { lane: Lane; y: "top" | "bottom" | number }
  /** a fraction of the section's vertical padding (the empty band where lane changes happen) */
  | { lane: Lane; pad: number }
  | { lane: Lane; sel: string; edge?: "top" | "bottom" | "center"; dy?: number }
  /** an element's centre; if it sits outside the section horizontally, the lane instead */
  | { anchor: string; dx?: number; dy?: number; fallback?: Lane }
  /** a fraction of the section's width, at an element's edge */
  | { frac: number; sel: string; edge?: "top" | "bottom" | "center"; dy?: number };

type Leg = {
  section: string;
  points: PointSpec[];
  /** only when the Stages frame is pinned ("track") or only when it is a column ("column"); default: always */
  when?: "track" | "column";
  /** draw over a custom scroll range, linearly by length (default: the tip follows the reading line) */
  range?: { start: string; end: string };
  /** the section pins itself: draw linearly over half a screen of scroll after the pin lets go */
  afterPin?: boolean;
  /** once its range is driven, fade the leg out (it would hang still over a pinned, moving track) */
  fadeAfter?: boolean;
};


const LEGS: Leg[] = [
  // the strip under the hero draws the first stretch itself (its time axis); the route leaves it at the right end
  { section: "route-profile", afterPin: true, points: [{ anchor: '[data-leg="out"]', fallback: "right" }, { lane: "right", y: "bottom" }] },
  // past the roadbook in the right lane, across to the left lane above the road signs, which stand at the roadside
  {
    section: "profile",
    points: [
      { lane: "right", y: "top" },
      { lane: "right", sel: "[data-signs]", edge: "top", dy: -150 },
      { lane: "left", sel: "[data-signs]", edge: "top", dy: -24 },
      { lane: "left", y: "bottom" },
    ],
  },
  // wide screens: into the start of the Stages road band, which the pinned frame drives; it exits on the right
  {
    section: "stages",
    when: "track",
    points: [{ lane: "left", y: "top" }, { anchor: ".stg-road-start" }],
    range: { start: "top bottom", end: "top top" },
    fadeAfter: true,
  },
  // when the pin lets go, the band's orange road has reached its end arrow: run on from there down the right lane
  {
    section: "stages",
    when: "track",
    afterPin: true,
    points: [{ anchor: ".stg-road-end" }, { lane: "right", y: "bottom" }],
  },
  { section: "stages", when: "column", points: [{ lane: "left", y: "top" }, { lane: "left", y: "bottom" }] },
  // after the pinned frame the road comes out on the right: cross back to the left lane in the empty top band
  {
    section: "service-park",
    when: "track",
    points: [{ lane: "right", y: "top" }, { lane: "right", pad: 0.15 }, { lane: "left", pad: 0.8 }, { lane: "left", y: "bottom" }],
  },
  { section: "service-park", when: "column", points: [{ lane: "left", y: "top" }, { lane: "left", y: "bottom" }] },
  { section: "builds", points: [{ lane: "left", y: "top" }, { lane: "left", y: "bottom" }] },
  // into the junction: the Side roads header's own route runs on across the screen; the leg resumes on the right
  {
    section: "side-roads",
    points: [{ lane: "left", y: "top" }, { lane: "left", sel: "#side-roads header > svg", edge: "bottom", dy: -2 }],
  },
  {
    section: "side-roads",
    points: [{ lane: "right", sel: "#side-roads header > svg", edge: "bottom", dy: -2 }, { lane: "right", y: "bottom" }],
  },
  {
    section: "gearbox",
    points: [{ lane: "right", y: "top" }, { lane: "right", pad: 0.12 }, { lane: "left", pad: 0.8 }, { lane: "left", y: "bottom" }],
  },
  // the last stretch ends on the Finish's chequered line, at the top edge of the orange field
  { section: "licences", points: [{ lane: "left", y: "top" }, { lane: "left", y: "bottom" }] },
];

const remPx = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

/** --section-y: clamp(6rem, 12vw, 11rem) */
function sectionPad() {
  const rem = remPx();
  return Math.min(Math.max(6 * rem, window.innerWidth * 0.12), 11 * rem);
}

function laneX(lane: Lane, width: number) {
  const rem = remPx();
  const gutter = Math.min(Math.max(rem, window.innerWidth * 0.04), 3.5 * rem);
  const container = Math.min(width, 88 * rem);
  const left = (width - container) / 2 + gutter * 0.45;
  return lane === "left" ? left : width - left;
}

function buildLeg(leg: Leg, section: HTMLElement) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("focusable", "false");
  svg.setAttribute("class", "route-leg");
  const road = document.createElementNS(NS, "path");
  road.setAttribute("class", "route-leg-road");
  const tip = document.createElementNS(NS, "circle");
  tip.setAttribute("class", "route-leg-tip");
  tip.setAttribute("r", "4.5");
  svg.append(road, tip);
  if (getComputedStyle(section).position === "static") section.style.position = "relative";
  section.prepend(svg);

  let total = 0;
  let samples: { len: number; y: number }[] = [];
  let y0 = 0;
  let y1 = 0;

  const layout = () => {
    const box = section.getBoundingClientRect();
    const W = section.clientWidth;
    const H = section.offsetHeight;
    if (!W || !H) return;
    const pts: { x: number; y: number }[] = [];
    /** a pinned element is measured by its pin spacer, which never leaves the flow */
    const rectOf = (el: Element) => {
      const spacer = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : null;
      return (spacer ?? el).getBoundingClientRect();
    };
    for (const p of leg.points) {
      if ("frac" in p) {
        const el = section.querySelector(p.sel);
        if (!el) return hide();
        const r = rectOf(el);
        const edge = p.edge === "bottom" ? r.bottom : p.edge === "center" ? r.top + r.height / 2 : r.top;
        pts.push({ x: W * p.frac, y: edge - box.top + (p.dy ?? 0) });
      } else if ("anchor" in p) {
        const el = section.querySelector(p.anchor);
        if (!el) return hide();
        const r = el.getBoundingClientRect();
        let x = r.left + r.width / 2 - box.left + (p.dx ?? 0);
        if (p.fallback && (x < 0 || x > W)) x = laneX(p.fallback, W);
        pts.push({ x, y: r.top + r.height / 2 - box.top + (p.dy ?? 0) });
      } else if ("sel" in p) {
        const el = section.querySelector(p.sel);
        if (!el) return hide();
        const r = rectOf(el);
        const edge = p.edge === "bottom" ? r.bottom : p.edge === "center" ? r.top + r.height / 2 : r.top;
        pts.push({ x: laneX(p.lane, W), y: edge - box.top + (p.dy ?? 0) });
      } else if ("pad" in p) {
        pts.push({ x: laneX(p.lane, W), y: sectionPad() * p.pad });
      } else {
        const y = p.y === "top" ? 0 : p.y === "bottom" ? H : p.y;
        pts.push({ x: laneX(p.lane, W), y });
      }
    }
    const f = (n: number) => n.toFixed(1);
    let d = `M${f(pts[0].x)} ${f(pts[0].y)}`;
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      if (Math.abs(a.x - b.x) < 0.5) d += `L${f(b.x)} ${f(b.y)}`;
      else {
        // a lane change: leave and arrive vertically, so the road sweeps across like a real bend
        const k = (b.y - a.y) * 0.55;
        d += `C${f(a.x)} ${f(a.y + k)} ${f(b.x)} ${f(b.y - k)} ${f(b.x)} ${f(b.y)}`;
      }
    }
    road.setAttribute("d", d);
    svg.style.display = "";
    total = road.getTotalLength();
    const n = Math.max(24, Math.min(400, Math.round(total / 8)));
    samples = [];
    for (let i = 0; i <= n; i += 1) {
      const len = (total * i) / n;
      samples.push({ len, y: road.getPointAtLength(len).y });
    }
    y0 = pts[0].y;
    y1 = pts[pts.length - 1].y;
  };

  const hide = () => {
    svg.style.display = "none";
    total = 0;
  };

  /** length of road above section-local y (the path only ever runs downwards) */
  const lengthAtY = (y: number) => {
    if (y <= samples[0]?.y) return 0;
    for (let i = 1; i < samples.length; i += 1) {
      const s = samples[i];
      if (s.y >= y) {
        const p = samples[i - 1];
        const t = s.y === p.y ? 1 : (y - p.y) / (s.y - p.y);
        return p.len + (s.len - p.len) * t;
      }
    }
    return total;
  };

  const paint = (len: number) => {
    if (!total) return;
    const l = Math.max(0, Math.min(total, len));
    road.style.strokeDasharray = `${l.toFixed(1)} ${(total + 20).toFixed(1)}`;
    const on = l > 0.5 && l < total - 0.5;
    tip.style.opacity = on ? "1" : "0";
    if (on) {
      const pt = road.getPointAtLength(l);
      tip.setAttribute("cx", pt.x.toFixed(1));
      tip.setAttribute("cy", pt.y.toFixed(1));
    }
  };

  return {
    svg,
    layout,
    paint,
    /**
     * Linear legs map scroll progress to length. Reading-line legs ask where the reading line crosses the section
     * right now, so a pin inside the section (its spacer) can never put the tip ahead of or behind the line.
     */
    progressToLength: (p: number) =>
      leg.range || leg.afterPin ? p * total : lengthAtY(window.innerHeight * LINE - section.getBoundingClientRect().top),
    drawAll: () => {
      road.style.strokeDasharray = "";
      tip.style.opacity = "0";
    },
    span: () => [y0, y1] as const,
  };
}

export function RouteLegs() {
  useGSAP(() => {
    const mm = gsap.matchMedia();
    mm.add({ track: STAGES_TRACK_QUERY, reduced: "(prefers-reduced-motion: reduce)", all: "all" }, (ctx) => {
      const { track, reduced } = ctx.conditions as { track: boolean; reduced: boolean };
      const cleanups = LEGS.filter((leg) => !leg.when || (leg.when === "track") === track).map((leg) => {
        const section = document.getElementById(leg.section);
        if (!section) return () => {};
        const built = buildLeg(leg, section);
        let progress = 0;
        const redraw = () => {
          built.layout();
          if (reduced) built.drawAll();
          else built.paint(built.progressToLength(progress));
        };
        redraw();
        ScrollTrigger.addEventListener("refresh", redraw);
        // a section that pins itself: the leg leaves once the pin lets go (no pin, e.g. short windows: the default)
        const pinOf = () => ScrollTrigger.getAll().find((t) => t.trigger === section && t.pin);
        const start = leg.afterPin
          ? () => {
              const pin = pinOf();
              return pin ? pin.end : `top ${LINE * 100}%`;
            }
          : (leg.range?.start ?? "top bottom");
        const end = leg.afterPin
          ? () => {
              const pin = pinOf();
              return pin ? pin.end + window.innerHeight * 0.5 : `bottom ${LINE * 100}%`;
            }
          : (leg.range?.end ?? "bottom top");
        const st = reduced
          ? null
          : ScrollTrigger.create({
              trigger: section,
              start,
              end,
              onUpdate: (self) => {
                progress = self.progress;
                built.paint(built.progressToLength(progress));
              },
              onRefresh: (self) => {
                progress = self.progress;
              },
              // past the leg: drawn in full; before it: not drawn (whatever the last frame measured)
              onLeave: () => {
                built.paint(Number.POSITIVE_INFINITY);
                if (leg.fadeAfter) built.svg.style.opacity = "0";
              },
              onEnterBack: () => {
                if (leg.fadeAfter) built.svg.style.opacity = "1";
              },
              onLeaveBack: () => built.paint(0),
            });
        return () => {
          ScrollTrigger.removeEventListener("refresh", redraw);
          st?.kill();
          built.svg.remove();
        };
      });
      return () => cleanups.forEach((c) => c());
    });
    return () => mm.revert();
  });

  return (
    <style href="route-legs" precedence="medium">{`
.route-leg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1;transition:opacity .35s cubic-bezier(.23,1,.32,1)}
.route-leg-road{fill:none;stroke:var(--color-route);stroke-width:2.5;stroke-linecap:round;stroke-linejoin:round}
.route-leg-tip{fill:var(--color-route);stroke:var(--color-paper);stroke-width:2;opacity:0;transition:opacity .2s}
#stages .route-leg-tip{stroke:var(--color-venice)}
#side-roads .route-leg-tip,#licences .route-leg-tip{stroke:var(--color-night)}
@media (max-width:767px){.route-leg-road{stroke-width:2}.route-leg-tip{r:3.5}}
`}</style>
  );
}
