"use client";

import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from "react";
import { lanes } from "@/content/timeline";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import {
  BAR_HALF,
  buildGeometry,
  carX,
  CHRONO,
  END_M,
  LABEL_SIZE,
  LANE_LABEL,
  monthLabel,
  NEXT_STAGE,
  PENNANT_H,
  PENNANT_W,
  ROAD_HALF,
  type FlagGeo,
  type Frame,
  type Geometry,
  type ItemGeo,
} from "./geometry";

/**
 * The route so far: a road-atlas STAGE PROFILE of my whole history, 2022 → 2026.
 *
 * - Top band: an elevation profile computed from the data (how many things were on the road each month),
 *   printed like a race programme's stage profile, with the three internship stage flags planted on the ridge.
 * - A time-axis road runs under it; a top-down car (the cursor car, larger) drives along it with a vertical
 *   marker as the section scrolls. Behind the car the ridge is inked in route orange (distance covered).
 * - One lane per area of work. Stretches are ink road segments, milestones are waypoint dots. Items ahead of
 *   the car are pale; the car lights each one as it reaches it (orange stripe / dot), then it settles to ink.
 *   Open stretches fade into the road ahead and stay lit: route orange is the road you are on.
 * - At the end of the road, past a chequered finish line: the next stage.
 *
 * Desktop with room (>= 1024 wide, content fits the window, motion allowed): the section pins for ~115vh and
 * vertical scroll drives the car. Short desktop windows: no pin, the car drives while the strip crosses the
 * viewport. Below 1024: the strip is a horizontally scrollable road and the car follows the swipe.
 * Reduced motion: everything drawn and labelled, the car parked at the next stage.
 *
 * The words (header, next stage, every item as a list) are server-rendered; the drawing mounts on the client
 * because it is laid out from measured text widths.
 */

const PIN_VH = 1.15;
const WIDE = "(min-width: 1024px)";
const MOTION = "(prefers-reduced-motion: no-preference)";
/** below this the strip never fits a pinned frame; crossing it re-runs the setup (the exact fit is measured) */
const TALL = "(min-height: 600px)";

/** The three latest stretches, as the static (and no-JS) pace notes. */
const FINAL_NOTES = CHRONO.slice(-3).map((p) => ({ id: p.id, current: p.open }));

const CSS = `
.rp{--rp-label:clamp(6.75rem,8.8vw,8.25rem);--rp-ahead:clamp(10rem,15.5vw,15rem);--rp-profile:clamp(6.25rem,15.5vh,9.25rem);--rp-axis:3.25rem;--rp-lane:clamp(2.875rem,6.3vh,3.625rem)}
.rp-frame{padding-top:clamp(4.5rem,9vw,7rem);padding-bottom:clamp(3rem,6vw,5rem)}
.rp[data-mode="pin"]{height:100svh}
.rp[data-mode="pin"] .rp-frame{height:100%;display:flex;flex-direction:column;justify-content:center;padding-top:calc(4rem + clamp(.75rem,3.2vh,2.5rem));padding-bottom:clamp(.75rem,2.4vh,1.75rem)}
.rp-head{margin-bottom:clamp(2.4rem,4.6vh,3.25rem)}
.rp-strip{position:relative;display:grid;grid-template-columns:var(--rp-label) minmax(0,1fr) var(--rp-ahead);grid-template-rows:var(--rp-profile) var(--rp-axis) repeat(5,var(--rp-lane));min-width:58rem}
.rp-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;pointer-events:none;z-index:1}
.rp-layer{position:absolute;inset:0;pointer-events:none;z-index:1}
.rp-reveal{overflow:hidden;will-change:transform}
.rp-reveal-inner{will-change:transform}
.rp-layer-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.rp-mover{position:absolute;left:-44px;top:0;pointer-events:none;z-index:1;will-change:transform}
.rp-svg text{font-family:var(--font-sans);font-feature-settings:"ss01","kern"}
.rp-cell{position:relative;z-index:2;display:flex;align-items:center;min-width:0}
.rp-leg{position:absolute;width:0;height:0;top:calc(var(--rp-profile) + 15px);pointer-events:none}
.rp-leg-in{left:0}
.rp-leg-out{right:0}
.rp-next{position:relative;z-index:2;align-self:start;padding:.1rem 0 0 1.85rem}
.rp-next-dot{display:inline-block;width:9px;height:9px;border-radius:999px;border:1.5px solid var(--color-ink);margin-right:.5rem;transform:translateY(-1px);transition:background-color .35s var(--ease-out),border-color .35s var(--ease-out)}
.rp[data-arrived="true"] .rp-next-dot{background:var(--color-route);border-color:var(--color-route)}

.rp-grid line{stroke:var(--color-paper-line);stroke-width:1;stroke-dasharray:2 4}
.rp-lane-sep line{stroke:var(--color-ink);stroke-opacity:.17;stroke-dasharray:12 9}
.rp-sil{fill:var(--color-rock-soft);fill-opacity:.55}
.rp-contour line{stroke:var(--color-rock);stroke-opacity:.75;stroke-width:1}
.rp-ridge{fill:none;stroke:var(--color-ink);stroke-width:1.3;stroke-linejoin:round}
.rp-ridge-driven{fill:none;stroke:var(--color-route);stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round}
.rp-axis-fill{fill:var(--color-paper-deep)}
.rp-axis-edge{stroke:var(--color-ink);stroke-opacity:.55;stroke-width:1}
.rp-axis-centre{stroke:var(--color-ink);stroke-opacity:.3;stroke-dasharray:6 6}
.rp-ahead-edge{stroke:var(--color-ink);stroke-opacity:.45;stroke-dasharray:4 5}
.rp-arrow{fill:none;stroke:var(--color-ink);stroke-opacity:.6;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round;transition:stroke .35s var(--ease-out),stroke-opacity .35s}
.rp[data-arrived="true"] .rp-arrow{stroke:var(--color-route);stroke-opacity:1}
.rp-axis-stripe{stroke:var(--color-route);stroke-width:3}
.rp-tick line{stroke:var(--color-ink);stroke-opacity:.32}
.rp-tick-y line{stroke-opacity:.7}
.rp-year{fill:var(--color-venice);font-family:var(--font-mono)!important;font-size:11px;letter-spacing:.06em;font-variant-numeric:tabular-nums}
.rp-chk-a{fill:var(--color-ink)}
.rp-chk-b{fill:var(--color-paper)}
.rp-pole{stroke:var(--color-ink);stroke-width:1}
.rp-foot{fill:var(--color-ink)}

.rp-item .rp-road{stroke:var(--color-ink);stroke-width:${BAR_HALF * 2}px;stroke-linecap:round;stroke-opacity:.24;transition:stroke-opacity .4s var(--ease-out)}
.rp-item .rp-dash{stroke:var(--color-paper);stroke-width:1.1;stroke-dasharray:3.5 4.5;opacity:0;transition:opacity .4s var(--ease-out)}
.rp-item .rp-stripe{stroke:var(--color-route);stroke-width:2.6;opacity:0;transition:opacity .4s var(--ease-out)}
.rp-item .rp-label{fill:var(--color-ink);fill-opacity:.74;font-size:${LABEL_SIZE}px;transition:fill-opacity .4s var(--ease-out)}
.rp-item .rp-dot{fill:var(--color-paper);stroke:var(--color-ink);stroke-opacity:.42;stroke-width:1.5;transition:fill .3s var(--ease-out),stroke .3s var(--ease-out),stroke-opacity .3s}
.rp-item:is([data-state="current"],[data-state="passed"]) .rp-road{stroke-opacity:1}
.rp-item:is([data-state="current"],[data-state="passed"]) .rp-label{fill-opacity:1}
.rp-item[data-state="passed"] .rp-dash{opacity:.8}
.rp-item[data-state="current"] .rp-stripe{opacity:1}
.rp-item[data-state="passed"] .rp-dot{fill:var(--color-ink);stroke:var(--color-ink);stroke-opacity:1}
.rp-item[data-state="current"] .rp-dot{fill:var(--color-route);stroke:var(--color-route-deep);stroke-opacity:1}
.rp-item[data-hover="true"] .rp-road{stroke-opacity:1}
.rp-item[data-hover="true"] .rp-label{fill-opacity:1}
.rp-item[data-hover="true"] .rp-dot{stroke-opacity:1}

.rp-flag .rp-pennant{fill:var(--color-paper);stroke:var(--color-venice);stroke-width:1;transition:fill .35s var(--ease-out),stroke .35s var(--ease-out)}
.rp-flag text{fill:var(--color-venice);font-family:var(--font-display)!important;font-weight:700;font-size:9.5px;letter-spacing:.02em;transition:fill .35s var(--ease-out)}
.rp-flag[data-state="passed"] .rp-pennant{fill:var(--color-venice)}
.rp-flag[data-state="passed"] text{fill:var(--color-paper)}
.rp-flag[data-state="current"] .rp-pennant{fill:var(--color-route);stroke:var(--color-route)}
.rp-flag[data-state="current"] text{fill:var(--color-night)}

.rp-marker{transition:opacity .3s var(--ease-out)}
.rp-marker-line{stroke:var(--color-route);stroke-width:1.25}
.rp-tag{fill:var(--color-ink)}
.rp-tag-text{fill:var(--color-paper);font-family:var(--font-mono)!important;font-size:10px;letter-spacing:.08em;font-variant-numeric:tabular-nums}
.rp-car-body{fill:var(--color-ink)}
.rp-car-tyre{fill:var(--color-ink);opacity:.55}
.rp-car-glass{fill:var(--color-rock-soft)}
.rp-car-tail{fill:var(--color-route-deep);opacity:.55;transition:opacity .25s,fill .25s}
.rp[data-arrived="true"] .rp-car-tail{fill:var(--color-route);opacity:1}
.rp-hit{pointer-events:all;fill:transparent}
.rp-sel path{fill:none;stroke:var(--color-route-deep);stroke-width:1.5;stroke-linecap:square}

.rp-tip{position:absolute;z-index:5;pointer-events:none;width:max-content;max-width:17.5rem}
.rp-notes-list>li{min-width:0}
.rp-list-panel{position:absolute;left:0;right:0;bottom:calc(100% + .6rem);z-index:20;max-height:min(36rem,72svh);overflow:auto;overscroll-behavior:contain}
@media (max-width:1023.98px){
  .rp{--rp-label:6.25rem;--rp-ahead:11.5rem;--rp-profile:7rem;--rp-lane:3.25rem}
  .rp-scroll{overflow-x:auto;overflow-y:hidden;margin-inline:calc(var(--gutter) * -1);overscroll-behavior-x:contain;scrollbar-width:none;-webkit-overflow-scrolling:touch;border-radius:0}
  .rp-scroll::-webkit-scrollbar{display:none}
  /* the gutter lives on an inner track, so the frozen lane column sticks to the screen edge, not 1rem in */
  .rp-track{width:max-content;padding-inline:var(--gutter)}
  .lenis .rp-scroll[data-lenis-prevent]{overscroll-behavior-y:auto}
  .rp-strip{width:68rem;min-width:0}
  .rp-cell{position:sticky;left:0;background:var(--color-paper)}
  .rp-cell::after{content:"";position:absolute;top:0;bottom:0;left:100%;width:1.5rem;background:linear-gradient(to right,var(--color-paper),transparent);pointer-events:none}
  .rp-cell::after{content:"";position:absolute;top:0;bottom:0;left:100%;width:18px;background:linear-gradient(90deg,var(--color-paper),rgb(245 238 221 / 0));pointer-events:none}
}
@media (max-width:639.98px){
  .rp-notes-list>li:not(:last-child){display:none}
}
`;

/** pointer x in strip coordinates, so a tooltip on a long stretch opens where you are, not at its middle */
function xIn(el: HTMLElement | null, e: { clientX: number }) {
  return e.clientX - (el?.getBoundingClientRect().left ?? 0);
}

function fmt(n: number) {
  return n.toFixed(1);
}

/* ── the car: the RouteCursor drawing, nose to the right ─────────────── */

function CarShape() {
  return (
    <>
      <rect className="rp-car-tyre" x="7" y="0" width="6" height="3" rx="1" />
      <rect className="rp-car-tyre" x="23" y="0" width="6" height="3" rx="1" />
      <rect className="rp-car-tyre" x="7" y="17" width="6" height="3" rx="1" />
      <rect className="rp-car-tyre" x="23" y="17" width="6" height="3" rx="1" />
      <path className="rp-car-body" d="M3 6.2C3 3.6 4.6 2 7.2 2H25.6C30.2 2 33.4 5.4 34 10C33.4 14.6 30.2 18 25.6 18H7.2C4.6 18 3 16.4 3 13.8Z" />
      <rect x="4" y="8.6" width="29" height="2.8" rx="1.4" className="fill-route" />
      <path className="rp-car-glass" d="M21.5 4.4H24.6C26.6 5.6 27.6 7.6 27.8 10C27.6 12.4 26.6 14.4 24.6 15.6H21.5Z" />
      <path className="rp-car-glass" d="M8.2 4.6H10.6V15.4H8.2C7.6 13.6 7.4 11.8 7.4 10C7.4 8.2 7.6 6.4 8.2 4.6Z" />
      <rect className="rp-car-tail" x="2.4" y="4.2" width="1.8" height="3.4" rx="0.8" />
      <rect className="rp-car-tail" x="2.4" y="12.4" width="1.8" height="3.4" rx="0.8" />
    </>
  );
}

/* ── the drawing ─────────────────────────────────────────────────────── */

type DrawingProps = {
  g: Geometry;
  selId: string | null;
  onEnter: (id: string, e: PointerEvent) => void;
  onLeave: (id: string, e: PointerEvent) => void;
  onTap: (id: string, e: MouseEvent) => void;
};

function Brackets({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const k = 7;
  const r = x + w;
  const b = y + h;
  return (
    <g className="rp-sel">
      <path d={`M${x} ${y + k}V${y}H${x + k}`} />
      <path d={`M${r - k} ${y}H${r}V${y + k}`} />
      <path d={`M${x} ${b - k}V${b}H${x + k}`} />
      <path d={`M${r - k} ${b}H${r}V${b - k}`} />
    </g>
  );
}

const Drawing = memo(function Drawing({ g, selId, onEnter, onLeave, onTap }: DrawingProps) {
  const top = g.roadY - ROAD_HALF;
  const bottom = g.roadY + ROAD_HALF;
  const sq = (ROAD_HALF * 2) / 4;
  const sel = selId ? g.items.find((i) => i.p.id === selId) : undefined;
  const finishFlagY = g.finishFlagY;

  return (
    <>
      <defs>
        <clipPath id="rp-sil-clip">
          <path d={g.fill} />
        </clipPath>
        <linearGradient id="rp-fade-grad" gradientUnits="userSpaceOnUse" x1={g.px1 - 28} y1="0" x2={g.fadeEnd} y2="0">
          <stop offset="0" stopColor="#fff" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <mask id="rp-fade" maskUnits="userSpaceOnUse" x="0" y="0" width={g.W} height={g.H}>
          <rect x="0" y="0" width={g.W} height={g.H} fill="url(#rp-fade-grad)" />
        </mask>
      </defs>

      {/* map grid: one hairline per year */}
      <g className="rp-grid">
        {g.years.slice(1).map((y) => (
          <line key={`p${y.label}`} x1={fmt(y.x)} x2={fmt(y.x)} y1={g.topY - 8} y2={g.baseY} />
        ))}
        {g.years.slice(1).map((y) => (
          <line key={`l${y.label}`} x1={fmt(y.x)} x2={fmt(y.x)} y1={g.lanesTop} y2={g.lanesBottom} />
        ))}
      </g>

      {/* lane markings */}
      <g className="rp-lane-sep">
        {g.laneLines.map((y, i) => (
          <line key={i} x1="0" x2={fmt(g.W)} y1={fmt(y)} y2={fmt(y)} />
        ))}
      </g>

      {/* the stage profile */}
      <path className="rp-sil" d={g.fill} />
      <g className="rp-contour" clipPath="url(#rp-sil-clip)">
        {g.contours.map((y) => (
          <line key={y} x1={fmt(g.px0)} x2={fmt(g.px1)} y1={fmt(y)} y2={fmt(y)} />
        ))}
      </g>
      <path className="rp-ridge" d={g.ridge} />
      <line className="rp-ridge" x1={fmt(g.px1)} x2={fmt(g.px1)} y1={fmt(g.ridgeEndY)} y2={fmt(g.baseY)} />

      {/* the time-axis road */}
      <rect className="rp-axis-fill" x="0" y={fmt(top)} width={fmt(g.px1)} height={ROAD_HALF * 2} />
      <line className="rp-axis-edge" x1="0" x2={fmt(g.px1)} y1={fmt(top)} y2={fmt(top)} />
      <line className="rp-axis-edge" x1="0" x2={fmt(g.px1)} y1={fmt(bottom)} y2={fmt(bottom)} />
      <line className="rp-axis-centre" x1="0" x2={fmt(g.px1)} y1={fmt(g.roadY)} y2={fmt(g.roadY)} />
      <g className="rp-tick">
        {g.monthTicks.map((x) => (
          <line key={x} x1={fmt(x)} x2={fmt(x)} y1={fmt(bottom)} y2={fmt(bottom + 3)} />
        ))}
      </g>
      <g className="rp-tick rp-tick-y">
        {g.years.map((y) => (
          <line key={y.label} x1={fmt(y.x)} x2={fmt(y.x)} y1={fmt(bottom)} y2={fmt(bottom + 8)} />
        ))}
      </g>
      {g.years.map((y) => (
        <text key={y.label} className="rp-year" x={fmt(y.x + 4)} y={fmt(bottom + 17)}>
          {y.label}
        </text>
      ))}

      {/* the road ahead: unpaved (dashed), open, pointing at the next stage */}
      <line className="rp-ahead-edge" x1={fmt(g.px1 + sq * 2)} x2={fmt(g.W - 14)} y1={fmt(top)} y2={fmt(top)} />
      <line className="rp-ahead-edge" x1={fmt(g.px1 + sq * 2)} x2={fmt(g.W - 14)} y1={fmt(bottom)} y2={fmt(bottom)} />
      <path className="rp-arrow" d={`M${fmt(g.W - 12)} ${fmt(g.roadY - 7)}L${fmt(g.W - 2)} ${fmt(g.roadY)}L${fmt(g.W - 12)} ${fmt(g.roadY + 7)}`} />

      {/* chequered finish line across the road, and the finish flag on the last ridge */}
      <g>
        {Array.from({ length: 8 }, (_, k) => {
          const col = k % 2;
          const row = Math.floor(k / 2);
          return (
            <rect
              key={k}
              className={(col + row) % 2 ? "rp-chk-a" : "rp-chk-b"}
              x={fmt(g.px1 + col * sq)}
              y={fmt(top + row * sq)}
              width={sq}
              height={sq}
            />
          );
        })}
        <line className="rp-pole" x1={fmt(g.px1)} x2={fmt(g.px1)} y1={fmt(g.ridgeEndY)} y2={fmt(finishFlagY)} />
        {Array.from({ length: 12 }, (_, k) => {
          const col = k % 4;
          const row = Math.floor(k / 4);
          return (
            <rect
              key={k}
              className={(col + row) % 2 ? "rp-chk-b" : "rp-chk-a"}
              x={fmt(g.px1 + col * 4)}
              y={fmt(finishFlagY + row * 4)}
              width="4"
              height="4"
            />
          );
        })}
        <rect x={fmt(g.px1)} y={fmt(finishFlagY)} width="16" height="12" fill="none" className="rp-pole" />
      </g>

      {/* stage flags on the ridge */}
      {g.flags.map((fl: FlagGeo) => (
        <g key={fl.code} data-flag={fl.code} className="rp-flag">
          <line className="rp-pole" x1={fmt(fl.x)} x2={fmt(fl.x)} y1={fmt(fl.y)} y2={fmt(fl.top)} />
          <rect className="rp-pennant" x={fmt(fl.x)} y={fmt(fl.top)} width={PENNANT_W} height={PENNANT_H} rx="1" />
          <text x={fmt(fl.x + PENNANT_W / 2)} y={fmt(fl.top + PENNANT_H / 2 + 3.4)} textAnchor="middle">
            {fl.code}
          </text>
          <circle className="rp-foot" cx={fmt(fl.x)} cy={fmt(fl.y)} r="2.2" />
        </g>
      ))}

      {/* the lanes */}
      {g.items.map((it: ItemGeo) => (
        <g key={it.p.id} data-item={it.p.id} className="rp-item">
          {it.p.event ? (
            <circle className="rp-dot" cx={fmt(it.x0)} cy={fmt(it.cy)} r="4.5" />
          ) : (
            <g mask={it.p.open ? "url(#rp-fade)" : undefined}>
              <line className="rp-road" x1={fmt(it.x0)} x2={fmt(it.x1)} y1={fmt(it.cy)} y2={fmt(it.cy)} />
              <line className="rp-dash" x1={fmt(it.x0 + 1)} x2={fmt(Math.max(it.x0 + 1, it.x1 - 1))} y1={fmt(it.cy)} y2={fmt(it.cy)} />
              <line data-stripe="" className="rp-stripe" x1={fmt(it.x0)} x2={fmt(it.x0)} y1={fmt(it.cy)} y2={fmt(it.cy)} />
            </g>
          )}
          <text
            className="rp-label"
            x={fmt(it.label.x)}
            y={fmt(it.label.y)}
            textAnchor={it.label.anchor}
            fontWeight={it.label.weight}
          >
            {it.label.text}
          </text>
        </g>
      ))}

      {/* hover / tap targets */}
      {g.items.map((it) => (
        <rect
          key={it.p.id}
          className="rp-hit"
          x={fmt(it.hit.x)}
          y={fmt(it.hit.y)}
          width={fmt(it.hit.w)}
          height={fmt(it.hit.h)}
          onPointerEnter={(e) => onEnter(it.p.id, e)}
          onPointerLeave={(e) => onLeave(it.p.id, e)}
          onClick={(e) => onTap(it.p.id, e)}
        />
      ))}

      {sel ? <Brackets x={sel.hit.x} y={sel.hit.y} w={sel.hit.w} h={sel.hit.h} /> : null}
    </>
  );
});

/**
 * What moves while you scroll lives outside the printed drawing, on its own compositor layers, so a drive frame
 * never repaints the big sheet:
 * - the driven ridge and the axis stripe are revealed with a counter-translated clip (the outer box slides left,
 *   the inner content slides back right): two transforms, no repaint;
 * - the car, its shadow, the marker and the date tag ride one narrow layer that is only translated.
 */
const MOVER_HALF = 44;
const DriveLayers = memo(function DriveLayers({ g }: { g: { ridge: string; px1: number; roadY: number; H: number; lanesBottom: number } }) {
  return (
    <>
      <div data-n="ridgeReveal" className="rp-layer rp-reveal">
        <div data-n="ridgeInner" className="rp-layer rp-reveal-inner">
          <svg className="rp-layer-svg" aria-hidden="true" focusable="false">
            <path className="rp-ridge-driven" d={g.ridge} />
          </svg>
        </div>
      </div>
      <div data-n="stripeReveal" className="rp-layer rp-reveal">
        <div data-n="stripeInner" className="rp-layer rp-reveal-inner">
          <svg className="rp-layer-svg" aria-hidden="true" focusable="false">
            <line className="rp-axis-stripe" x1="0" x2={fmt(g.px1)} y1={fmt(g.roadY)} y2={fmt(g.roadY)} />
          </svg>
        </div>
      </div>
      <div data-n="mover" className="rp-mover" style={{ width: MOVER_HALF * 2, height: g.H }}>
        <svg className="rp-layer-svg" aria-hidden="true" focusable="false">
          <defs>
            <filter id="rp-car-shadow" x="-30%" y="-50%" width="160%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.3" floodColor="#0e2f44" floodOpacity="0.3" />
            </filter>
          </defs>
          <g data-n="marker" className="rp-marker" transform={`translate(${MOVER_HALF} 0)`}>
            <line className="rp-marker-line" x1="0" x2="0" y1="-5" y2={fmt(g.lanesBottom)} />
            <g data-n="tag">
              <rect className="rp-tag" x="-32" y="-24" width="64" height="18" rx="3" />
              <text data-n="tagText" className="rp-tag-text" x="0" y="-11.5" textAnchor="middle">
                {monthLabel(END_M - 1).toUpperCase()}
              </text>
            </g>
          </g>
          <g transform={`translate(${MOVER_HALF} ${fmt(g.roadY)})`}>
            <g transform="scale(1.45) translate(-18 -10)" filter="url(#rp-car-shadow)">
              <CarShape />
            </g>
          </g>
        </svg>
      </div>
    </>
  );
});

/* ── small printed pieces ────────────────────────────────────────────── */

function Legend() {
  return (
    <ul
      aria-hidden="true"
      className="flex w-fit flex-wrap items-center gap-x-5 gap-y-2 rounded-[3px] border border-paper-line bg-paper px-3.5 py-2.5 text-[0.8125rem] leading-none text-ink/80"
    >
      <li className="inline-flex items-center gap-2">
        <svg viewBox="0 0 30 10" className="h-2.5 w-[30px]" fill="none">
          <line x1="5" x2="25" y1="5" y2="5" stroke="var(--color-ink)" strokeWidth="8" strokeLinecap="round" />
          <line x1="5" x2="25" y1="5" y2="5" stroke="var(--color-paper)" strokeWidth="1.1" strokeDasharray="3.5 4.5" />
        </svg>
        A stretch
      </li>
      <li className="inline-flex items-center gap-2">
        <svg viewBox="0 0 12 12" className="size-3" fill="none">
          <circle cx="6" cy="6" r="4.4" fill="var(--color-ink)" />
        </svg>
        A milestone
      </li>
      <li className="inline-flex items-center gap-2">
        <svg viewBox="0 0 30 10" className="h-2.5 w-[30px]" fill="none">
          <line x1="5" x2="25" y1="5" y2="5" stroke="var(--color-ink)" strokeWidth="8" strokeLinecap="round" />
          <line x1="5" x2="25" y1="5" y2="5" stroke="var(--color-route)" strokeWidth="2.6" />
        </svg>
        Under the car
      </li>
      <li className="inline-flex items-center gap-2">
        <svg viewBox="0 0 16 18" className="h-[18px] w-4" fill="none">
          <line x1="2" x2="2" y1="2" y2="17" stroke="var(--color-ink)" strokeWidth="1" />
          <rect x="2" y="2" width="12" height="8" fill="var(--color-venice)" />
        </svg>
        Internship stage
      </li>
    </ul>
  );
}

type Note = { id: string; current: boolean };
type Tip = { id: string; via: "pointer" | "key" | "tap"; px?: number };

const ITEM_TEXT = (id: string) => {
  const p = CHRONO.find((c) => c.id === id);
  if (!p) return "";
  return `${p.item.label}, ${p.item.period}${p.item.detail ? `. ${p.item.detail}` : ""}. ${LANE_LABEL[p.item.lane]} lane.`;
};

type Nodes = {
  mover: HTMLDivElement;
  marker: SVGGElement;
  tag: SVGGElement;
  tagText: SVGTextElement;
  ridgeReveal: HTMLDivElement;
  ridgeInner: HTMLDivElement;
  stripeReveal: HTMLDivElement;
  stripeInner: HTMLDivElement;
  items: { el: SVGGElement; stripe: SVGLineElement | null; g: ItemGeo; state: string }[];
  flags: { el: SVGGElement; g: FlagGeo; state: string }[];
  month: number;
  onPlot: boolean | null;
  arrived: boolean | null;
};

/* ── the section ─────────────────────────────────────────────────────── */

export function RouteProfile() {
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const [geo, setGeo] = useState<Geometry | null>(null);
  const [notes, setNotes] = useState<Note[]>(FINAL_NOTES);
  const [tip, setTip] = useState<Tip | null>(null);
  const [live, setLive] = useState("");

  const geoRef = useRef<Geometry | null>(null);
  const nodesRef = useRef<Nodes | null>(null);
  const progressRef = useRef(1);
  const notesKeyRef = useRef(FINAL_NOTES.map((n) => `${n.id}${n.current ? "*" : ""}`).join("|"));

  /** Writes the drive state into the drawing. Called per scroll frame: DOM writes only, no reads. */
  const apply = useCallback(() => {
    const g = geoRef.current;
    const n = nodesRef.current;
    const section = sectionRef.current;
    if (!g || !n || !section) return;
    const p = progressRef.current;
    const x = carX(g, p);
    const xs = fmt(x);

    n.mover.style.transform = `translate3d(${xs}px,0,0)`;
    const onPlot = x <= g.px1 + 0.5;
    if (onPlot !== n.onPlot) {
      n.onPlot = onPlot;
      n.marker.style.opacity = onPlot ? "1" : "0";
    }
    const tagX = Math.min(g.W - 32, Math.max(32, x)) - x;
    const tagT = `translate(${fmt(tagX)} 0)`;
    if (n.tag.getAttribute("transform") !== tagT) n.tag.setAttribute("transform", tagT);
    const month = Math.min(END_M - 1, Math.max(0, Math.floor(g.mOf(x))));
    if (month !== n.month) {
      n.month = month;
      n.tagText.textContent = monthLabel(month).toUpperCase();
    }
    const reveal = (outer: HTMLDivElement, inner: HTMLDivElement, cut: number) => {
      const off = fmt(g.W - Math.max(0, Math.min(g.W, cut)));
      outer.style.transform = `translate3d(-${off}px,0,0)`;
      inner.style.transform = `translate3d(${off}px,0,0)`;
    };
    reveal(n.ridgeReveal, n.ridgeInner, Math.min(x, g.px1));
    reveal(n.stripeReveal, n.stripeInner, Math.max(0, x - 22));

    for (const it of n.items) {
      const ig = it.g;
      const state = x < ig.x0 - 0.5 ? "ahead" : x <= ig.curEnd ? "current" : "passed";
      if (state !== it.state) {
        it.state = state;
        it.el.setAttribute("data-state", state);
      }
      if (it.stripe) {
        const end = Math.min(Math.max(x, ig.x0), ig.stripeEnd);
        it.stripe.setAttribute("x2", fmt(end));
      }
    }
    for (const f of n.flags) {
      const state = x < f.g.curStart - 0.5 ? "ahead" : x <= f.g.curEnd ? "current" : "passed";
      if (state !== f.state) {
        f.state = state;
        f.el.setAttribute("data-state", state);
      }
    }
    const arrived = p >= 0.985;
    if (arrived !== n.arrived) {
      n.arrived = arrived;
      section.dataset.arrived = arrived ? "true" : "false";
    }

    // pace notes: the three latest stretches the car has reached
    const byId = new Map(n.items.map((i) => [i.g.p.id, i.state]));
    const reached = CHRONO.filter((c) => byId.get(c.id) !== "ahead").slice(-3);
    const next = reached.map((c) => ({ id: c.id, current: byId.get(c.id) === "current" }));
    const key = next.map((k) => `${k.id}${k.current ? "*" : ""}`).join("|");
    if (key !== notesKeyRef.current) {
      notesKeyRef.current = key;
      setNotes(next);
    }
  }, []);

  /* measure the live layout and build the geometry (on resize and once the fonts land) */
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;
    let raf = 0;
    let lastKey = "";
    let canvas: HTMLCanvasElement | null = null;

    const run = (force = false) => {
      raf = 0;
      const laneEls = Array.from(strip.querySelectorAll<HTMLElement>("[data-rp-lane]"));
      const profileEl = strip.querySelector<HTMLElement>("[data-rp-row='profile']");
      const nextEl = strip.querySelector<HTMLElement>("[data-rp-next]");
      if (!laneEls.length || !profileEl || !nextEl) return;
      const frame: Frame = {
        W: strip.clientWidth,
        H: strip.clientHeight,
        labelW: laneEls[0].offsetWidth,
        aheadX: nextEl.offsetLeft,
        profileH: profileEl.offsetHeight,
        lanes: laneEls.map((el) => ({ top: el.offsetTop, h: el.offsetHeight })),
      };
      const key = `${frame.W}x${frame.H}x${frame.labelW}x${frame.aheadX}`;
      if (!force && key === lastKey) return;
      lastKey = key;
      canvas ??= document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const family = getComputedStyle(strip).fontFamily;
      const measure = (text: string, weight: number) => {
        if (!ctx) return text.length * LABEL_SIZE * 0.56;
        ctx.font = `${weight} ${LABEL_SIZE}px ${family}`;
        return ctx.measureText(text).width;
      };
      setGeo(buildGeometry(frame, measure));
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(() => run());
    };
    const ro = new ResizeObserver(schedule);
    ro.observe(strip);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) requestAnimationFrame(() => run(true));
    });
    return () => {
      alive = false;
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  /* after each layout: collect the nodes the drive writes to, then re-apply the current drive state */
  useLayoutEffect(() => {
    geoRef.current = geo;
    const svg = svgRef.current;
    if (!geo || !svg) {
      nodesRef.current = null;
      return;
    }
    const host = stripRef.current ?? svg;
    const q = <T extends Element>(name: string) => host.querySelector<T>(`[data-n="${name}"]`);
    const mover = q<HTMLDivElement>("mover");
    const marker = q<SVGGElement>("marker");
    const tag = q<SVGGElement>("tag");
    const tagText = q<SVGTextElement>("tagText");
    const ridgeReveal = q<HTMLDivElement>("ridgeReveal");
    const ridgeInner = q<HTMLDivElement>("ridgeInner");
    const stripeReveal = q<HTMLDivElement>("stripeReveal");
    const stripeInner = q<HTMLDivElement>("stripeInner");
    if (!mover || !marker || !tag || !tagText || !ridgeReveal || !ridgeInner || !stripeReveal || !stripeInner) return;
    const itemEls = new Map(Array.from(svg.querySelectorAll<SVGGElement>("[data-item]")).map((el) => [el.dataset.item, el]));
    const flagEls = new Map(Array.from(svg.querySelectorAll<SVGGElement>("[data-flag]")).map((el) => [el.dataset.flag, el]));
    nodesRef.current = {
      mover,
      marker,
      tag,
      tagText,
      ridgeReveal,
      ridgeInner,
      stripeReveal,
      stripeInner,
      items: geo.items.flatMap((g) => {
        const el = itemEls.get(g.p.id);
        return el ? [{ el, stripe: el.querySelector<SVGLineElement>("[data-stripe]"), g, state: "" }] : [];
      }),
      flags: geo.flags.flatMap((g) => {
        const el = flagEls.get(g.code);
        return el ? [{ el, g, state: "" }] : [];
      }),
      month: -1,
      onPlot: null,
      arrived: null,
    };
    apply();
  }, [geo, apply]);

  /* how the car is driven: pinned scroll, unpinned scroll, horizontal swipe, or parked (reduced motion) */
  useGSAP(
    () => {
      const section = sectionRef.current;
      const frame = frameRef.current;
      const scroller = scrollRef.current;
      const strip = stripRef.current;
      if (!section || !frame || !scroller || !strip) return;

      const mm = gsap.matchMedia();
      mm.add({ wide: WIDE, motion: MOTION, tall: TALL }, (ctx) => {
        const { wide, motion, tall } = ctx.conditions as { wide: boolean; motion: boolean; tall: boolean };

        if (!motion) {
          section.dataset.mode = "static";
          progressRef.current = 1;
          apply();
          return () => {
            delete section.dataset.mode;
          };
        }

        if (!wide) {
          section.dataset.mode = "swipe";
          let raf = 0;
          const read = () => {
            raf = 0;
            const max = scroller.scrollWidth - scroller.clientWidth;
            progressRef.current = max > 0 ? scroller.scrollLeft / max : 0;
            apply();
          };
          const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(read);
          };
          scroller.addEventListener("scroll", onScroll, { passive: true });
          read();

          // one demo drive the first time the road is in view: the car runs 2022 → next stage on its own and
          // stays there (the recent stretches and the next stage are what a phone visitor should see first).
          // Only a horizontal gesture, a mouse press or a key on the road takes over; a vertical page scroll
          // that happens to start on the strip leaves it running.
          let demo: gsap.core.Tween | null = null;
          const stop = () => {
            demo?.kill();
            demo = null;
          };
          const io = new IntersectionObserver(
            ([entry]) => {
              if (!entry?.isIntersecting) return;
              io.disconnect();
              const max = scroller.scrollWidth - scroller.clientWidth;
              if (max <= 0 || scroller.scrollLeft > 4) return;
              demo = gsap.to(scroller, { scrollLeft: max, duration: 4.6, delay: 0.5, ease: "steer", onComplete: stop });
            },
            { threshold: 0.55 },
          );
          io.observe(scroller);
          let t0: { x: number; y: number } | null = null;
          const onTouchStart = (e: TouchEvent) => {
            const t = e.touches[0];
            t0 = t ? { x: t.clientX, y: t.clientY } : null;
          };
          const onTouchMove = (e: TouchEvent) => {
            const t = e.touches[0];
            if (!t0 || !t) return;
            const dx = Math.abs(t.clientX - t0.x);
            if (dx > 6 && dx > Math.abs(t.clientY - t0.y)) stop();
          };
          const onWheel = (e: WheelEvent) => {
            if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) stop();
          };
          const onPointer = (e: globalThis.PointerEvent) => {
            if (e.pointerType === "mouse") stop();
          };
          scroller.addEventListener("touchstart", onTouchStart, { passive: true });
          scroller.addEventListener("touchmove", onTouchMove, { passive: true });
          scroller.addEventListener("wheel", onWheel, { passive: true });
          scroller.addEventListener("pointerdown", onPointer, { passive: true });
          scroller.addEventListener("keydown", stop);
          return () => {
            io.disconnect();
            stop();
            scroller.removeEventListener("touchstart", onTouchStart);
            scroller.removeEventListener("touchmove", onTouchMove);
            scroller.removeEventListener("wheel", onWheel);
            scroller.removeEventListener("pointerdown", onPointer);
            scroller.removeEventListener("keydown", stop);
            scroller.removeEventListener("scroll", onScroll);
            cancelAnimationFrame(raf);
            delete section.dataset.mode;
          };
        }

        // wide: pin when the whole strip fits the window, otherwise drive while it crosses the viewport
        section.dataset.mode = "pin";
        const fits = tall && frame.scrollHeight <= frame.clientHeight + 1;
        if (!fits) section.dataset.mode = "scrub";
        const pin = fits;
        const st = ScrollTrigger.create({
          trigger: pin ? section : strip,
          start: pin ? "top top" : "top 72%",
          end: pin ? () => `+=${Math.round(window.innerHeight * PIN_VH)}` : "bottom 30%",
          pin,
          anticipatePin: pin ? 1 : 0,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            progressRef.current = self.progress;
            apply();
          },
          onRefresh: (self) => {
            progressRef.current = self.progress;
            apply();
          },
        });
        progressRef.current = st.progress;
        apply();
        return () => {
          delete section.dataset.mode;
          delete section.dataset.arrived;
        };
      });
    },
    { scope: sectionRef, dependencies: [apply] },
  );

  /* the hovered / selected item is marked straight on its node: re-rendering the drawing for it would cost a frame */
  const tipId = tip?.id ?? null;
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || !tipId) return;
    const el = svg.querySelector(`[data-item="${tipId}"]`);
    el?.setAttribute("data-hover", "true");
    return () => el?.removeAttribute("data-hover");
  }, [tipId, geo]);

  /* hover, tap and keyboard reading */
  const onEnter = useCallback((id: string, e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setTip({ id, via: "pointer", px: xIn(stripRef.current, e) });
  }, []);
  const onLeave = useCallback((id: string, e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    setTip((t) => (t && t.via === "pointer" && t.id === id ? null : t));
  }, []);
  /** A click (never a swipe: browsers do not click after a scroll gesture) pins the detail; on a fine pointer
   *  that is already showing from the hover, so it stays as it is. */
  const onTap = useCallback((id: string, e: MouseEvent) => {
    const px = xIn(stripRef.current, e);
    setTip((t) => {
      if (t && t.via === "pointer" && t.id === id) return t;
      return t && t.id === id ? null : { id, via: "tap", px };
    });
  }, []);

  // a pinned (tapped) detail closes on the next tap anywhere else
  useEffect(() => {
    if (!tip || tip.via !== "tap") return;
    const close = (e: Event) => {
      if (!(e.target instanceof Element) || !e.target.closest(".rp-hit")) setTip(null);
    };
    document.addEventListener("pointerdown", close, { passive: true });
    return () => document.removeEventListener("pointerdown", close);
  }, [tip]);

  const select = (id: string) => {
    setTip({ id, via: "key" });
    setLive(ITEM_TEXT(id));
    const g = geoRef.current;
    const scroller = scrollRef.current;
    const it = g?.items.find((i) => i.p.id === id);
    if (it && scroller && scroller.scrollWidth > scroller.clientWidth + 1) {
      const left = it.hit.x + it.hit.w / 2 - scroller.clientWidth / 2;
      scroller.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const order = CHRONO.map((c) => c.id);
    const cur = tip ? order.indexOf(tip.id) : -1;
    let next = -1;
    if (e.key === "ArrowRight") next = cur < 0 ? 0 : Math.min(order.length - 1, cur + 1);
    else if (e.key === "ArrowLeft") next = cur < 0 ? 0 : Math.max(0, cur - 1);
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = order.length - 1;
    else if (e.key === "Escape" && tip) {
      e.preventDefault();
      setTip(null);
      return;
    }
    if (next >= 0) {
      e.preventDefault();
      select(order[next]);
    }
  };

  const tipItem = tip && geo ? geo.items.find((i) => i.p.id === tip.id) : undefined;
  let tipStyle: React.CSSProperties | undefined;
  if (tipItem && geo) {
    const mid = tipItem.hit.x + tipItem.hit.w / 2;
    const cx = tip?.px !== undefined ? Math.min(tipItem.hit.x + tipItem.hit.w - 20, Math.max(tipItem.hit.x + 20, tip.px)) : mid;
    const above = tipItem.hit.y > 110;
    tipStyle = {
      left: Math.min(geo.W - 8, Math.max(8, cx)),
      top: above ? tipItem.hit.y - 6 : tipItem.hit.y + tipItem.hit.h + 6,
      transform: `translate(${cx < 150 ? "-12%" : cx > geo.W - 150 ? "-88%" : "-50%"}, ${above ? "-100%" : "0"})`,
    };
  }

  return (
    <section
      ref={sectionRef}
      id="route-profile"
      aria-labelledby="route-profile-title"
      className="rp relative bg-paper text-ink"
    >
      <style href="routeprofile-strip" precedence="medium">
        {CSS}
      </style>

      <div ref={frameRef} className="rp-frame relative mx-auto max-w-[var(--container-route)] px-[var(--gutter)]">
        <header className="rp-head flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
          <div>
            <h2
              id="route-profile-title"
              className="font-display text-[clamp(1.3rem,1.9vw,1.7rem)] font-semibold leading-none tracking-[-0.02em] text-ink"
            >
              The route so far
            </h2>
            <p className="mt-3 text-[clamp(1rem,1.25vw,1.125rem)] leading-snug text-ink/75">2022 to 2026, lane by lane.</p>
          </div>
          <Legend />
        </header>

        <p aria-hidden="true" className="mb-3 flex items-center gap-2 text-[0.875rem] text-ink/75 lg:hidden">
          Swipe along the road
          <svg viewBox="0 0 24 10" className="h-2.5 w-6" fill="none">
            <path d="M1 5h20M17 1.5 21.5 5 17 8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </p>

        <div
          ref={scrollRef}
          className="rp-scroll rounded-[4px]"
          data-lenis-prevent=""
          tabIndex={0}
          role="group"
          aria-label="The route as a drawing. Use the left and right arrow keys to read each stretch."
          onKeyDown={onKeyDown}
          onBlur={() => setTip((t) => (t && t.via === "key" ? null : t))}
        >
          <div className="rp-track">
          <div ref={stripRef} className="rp-strip">
            <div data-rp-row="profile" aria-hidden="true" className="rp-cell flex-col !items-start justify-center pr-3" style={{ gridColumn: 1, gridRow: 1 }}>
              <span className="text-[0.8125rem] font-semibold leading-tight text-ink">Stage profile</span>
              <span className="mt-1 text-[0.75rem] leading-snug text-ink/70">How much was on the road each month</span>
            </div>
            <div data-rp-row="axis" aria-hidden="true" className="rp-cell" style={{ gridColumn: 1, gridRow: 2 }} />
            {lanes.map((lane, i) => (
              <div
                key={lane.id}
                data-rp-lane={i}
                aria-hidden="true"
                className="rp-cell pr-3 max-lg:pr-2"
                style={{ gridColumn: 1, gridRow: 3 + i }}
              >
                <span className="inline-flex items-center gap-1.5 rounded-[3px] bg-venice py-[0.3rem] pr-2 pl-1.5 text-[0.75rem] leading-none font-semibold whitespace-nowrap text-paper max-lg:pl-2 max-lg:text-[0.6875rem]">
                  <svg viewBox="0 0 10 10" className="size-2.5 shrink-0 max-lg:hidden" fill="none">
                    <path d="M1.5 5h6M5 2l3 3-3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {lane.label}
                </span>
              </div>
            ))}

            <div data-rp-next="" className="rp-next" style={{ gridColumn: 3, gridRow: 1 }}>
              <p className="text-[0.75rem] leading-none font-semibold tracking-[0.12em] text-venice uppercase">
                <span aria-hidden="true" className="rp-next-dot" />
                {NEXT_STAGE.label}
              </p>
              <p className="mt-2 max-w-[15rem] text-[clamp(0.95rem,1.1vw,1.0625rem)] leading-[1.3] font-semibold text-balance text-ink">
                {NEXT_STAGE.detail}
              </p>
            </div>

            <svg ref={svgRef} className="rp-svg" aria-hidden="true" focusable="false">
              {geo ? (
                <Drawing
                  g={geo}
                  selId={tip && tip.via !== "pointer" ? tip.id : null}
                  onEnter={onEnter}
                  onLeave={onLeave}
                  onTap={onTap}
                />
              ) : null}
            </svg>
            {geo ? <DriveLayers g={geo} /> : null}

            {/* route continuity: the page road joins this strip's axis road at both ends */}
            <span data-leg="in" aria-hidden="true" className="rp-leg rp-leg-in" />
            <span data-leg="out" aria-hidden="true" className="rp-leg rp-leg-out" />

            {tipItem && tipStyle ? (
              <div aria-hidden="true" className="rp-tip rounded-[3px] border border-ink/20 bg-paper px-3 py-2.5" style={tipStyle}>
                <p className="text-[0.6875rem] leading-none font-semibold tracking-[0.1em] text-ink/65 uppercase">
                  {LANE_LABEL[tipItem.p.item.lane]}
                </p>
                <p className="mt-1.5 text-[0.9375rem] leading-tight font-semibold text-ink">{tipItem.p.item.label}</p>
                {tipItem.p.item.detail ? (
                  <p className="mt-1 text-[0.8125rem] leading-snug text-ink/80">{tipItem.p.item.detail}</p>
                ) : null}
                <p className="t-map mt-2 text-[0.6875rem] leading-none text-venice">{tipItem.p.item.period}</p>
              </div>
            ) : null}
          </div>
          </div>
        </div>

        {/* pace notes: what the car has just reached (the full list below carries the same facts) */}
        <div aria-hidden="true" className="rp-notes mt-5 grid grid-cols-[var(--rp-label)_minmax(0,1fr)] items-start border-t border-paper-line pt-3.5 max-lg:grid-cols-1 max-lg:gap-y-2">
          <p className="text-[0.8125rem] leading-5 font-semibold text-ink">Pace notes</p>
          <ol className="rp-notes-list grid min-h-[3.25rem] grid-cols-3 gap-x-8 max-sm:grid-cols-1">
            {notes.length ? (
              notes.map((n) => {
                const p = CHRONO.find((c) => c.id === n.id);
                if (!p) return null;
                return (
                  <li key={n.id} className="relative pl-4">
                    <span
                      className={`absolute top-[0.42rem] left-0 size-[7px] rounded-full ${n.current ? "bg-route" : "bg-ink"}`}
                    />
                    <p className="flex flex-wrap items-baseline gap-x-2 text-[0.875rem] leading-5">
                      <span className="font-semibold text-ink">{p.item.label}</span>
                      <span className="t-map text-[0.6875rem] text-venice">{p.item.period}</span>
                    </p>
                    {p.item.detail ? (
                      <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-[1.35] text-ink/75">{p.item.detail}</p>
                    ) : null}
                  </li>
                );
              })
            ) : (
              <li className="col-span-3 text-[0.875rem] leading-5 text-ink/75">
                <span className="max-lg:hidden">
                  Scroll to drive. Each stretch lights up as the car reaches it; hover one for its detail.
                </span>
                <span className="lg:hidden">Swipe along the road. Each stretch lights up as the car reaches it; tap one for its detail.</span>
              </li>
            )}
          </ol>
        </div>

        {/* the whole route as text */}
        <details
          className="rp-list relative mt-4"
          onKeyDown={(e) => {
            if (e.key === "Escape" && e.currentTarget.open) {
              e.currentTarget.open = false;
              e.currentTarget.querySelector("summary")?.focus();
            }
          }}
        >
          <summary className="inline-flex cursor-pointer list-none items-center gap-2 border-b border-ink/25 pb-0.5 text-[0.875rem] leading-6 font-medium text-ink transition-colors hover:border-ink [&::-webkit-details-marker]:hidden">
            Read the route as a list
            <svg aria-hidden="true" viewBox="0 0 12 12" className="size-3" fill="none">
              <path d="M2.5 4.5 6 8l3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </summary>
          <div className="rp-list-panel rounded-[3px] border border-paper-line bg-paper px-5 py-4 sm:px-6" data-lenis-prevent="">
            <ol className="divide-y divide-paper-line">
              {CHRONO.map((p) => (
                <li key={p.id} className="grid gap-x-6 gap-y-0.5 py-2.5 sm:grid-cols-[10.5rem_minmax(0,1fr)_9rem]">
                  <span className="t-map pt-[0.2rem] text-venice">{p.item.period}</span>
                  <span>
                    <span className="block text-[0.9375rem] leading-snug font-semibold text-ink">{p.item.label}</span>
                    {p.item.detail ? <span className="block text-[0.875rem] leading-snug text-ink/80">{p.item.detail}</span> : null}
                  </span>
                  <span className="text-[0.8125rem] leading-snug text-ink/70 sm:text-right">{LANE_LABEL[p.item.lane]}</span>
                </li>
              ))}
              <li className="grid gap-x-6 gap-y-0.5 py-2.5 sm:grid-cols-[10.5rem_minmax(0,1fr)_9rem]">
                <span className="text-[0.8125rem] leading-snug font-semibold tracking-[0.1em] text-venice uppercase">
                  {NEXT_STAGE.label}
                </span>
                <span className="text-[0.9375rem] leading-snug font-semibold text-ink">{NEXT_STAGE.detail}</span>
              </li>
            </ol>
          </div>
        </details>

        <p className="sr-only" aria-live="polite">
          {live}
        </p>
      </div>
    </section>
  );
}
