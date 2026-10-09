"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { gears } from "@/content/site";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { GearPanel } from "./GearPanel";
import { PLATE_RINGS } from "./plateContours";
import {
  GEAR_COUNT,
  NEUTRAL_ZONE,
  SLOT_X,
  VB,
  Y_BOT,
  Y_N,
  Y_TOP,
  gearPoint,
  knobLabel,
  nearestOnGate,
  pathLength,
  pointAt,
  pointFor,
  route,
  toPath,
  type Pt,
} from "./geometry";

type DragKit = {
  Draggable: typeof import("gsap/Draggable").Draggable;
  InertiaPlugin: typeof import("gsap/InertiaPlugin").InertiaPlugin;
};

/** Drag code loads once, the first time a shifter mounts; the rest of the page never pays for it. */
let dragKit: Promise<DragKit> | null = null;
const loadDragKit = () =>
  (dragKit ??= Promise.all([import("gsap/Draggable"), import("gsap/InertiaPlugin")]).then(([d, i]) => {
    gsap.registerPlugin(d.Draggable, i.InertiaPlugin);
    return { Draggable: d.Draggable, InertiaPlugin: i.InertiaPlugin };
  }));

type ShifterApi = {
  shiftTo: (gear: number | null) => void;
  preview: (gear: number | null | undefined) => void;
};

/** The gate as separate strokes: three slots, then the neutral channel. */
const GATE_SEGMENTS = [...SLOT_X.map((x) => `M ${x} ${Y_TOP} V ${Y_BOT}`), `M ${SLOT_X[0]} ${Y_N} H ${SLOT_X[2]}`];

/** Gear label anchors: odd gears sit above their slot, even gears below. */
const LABEL_GAP = 38;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

/**
 * The H-pattern shifter. Three ways to shift, all along the same gate:
 *  - click / tap a gear label: the knob travels out of its slot, along neutral and into the new slot
 *    ("steer", ~450 ms), then settles with a 2 px overshoot;
 *  - drag the knob (Draggable on a proxy + InertiaPlugin velocity): it chases the pointer but can
 *    only move along the gate; on release it drops into the nearest gear, or stays in neutral;
 *  - keyboard: the labels are a radiogroup (arrows move, 1-6 jump, N for neutral).
 * Per-frame position lives in a ref and is written straight to the knob's transform.
 */
export function Shifter() {
  const [gear, setGear] = useState<number | null>(1);
  const [announce, setAnnounce] = useState("");

  const rootRef = useRef<HTMLDivElement>(null);
  const plateRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const faceRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const proxyRef = useRef<HTMLDivElement>(null);
  const trailRef = useRef<SVGPathElement>(null);
  const previewRef = useRef<SVGPathElement>(null);
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const pos = useRef<Pt>(gearPoint(1));
  const api = useRef<ShifterApi | null>(null);
  const interacted = useRef(false);
  const reduced = useReducedMotion();

  const describe = (g: number | null) => {
    if (g === null) return "Neutral: all six gears listed.";
    const group = gears[g - 1];
    return `Gear ${g}, ${group.name}: ${group.items.map((i) => i.name).join(", ")}.`;
  };

  /** Every user-driven shift goes through here (click, keys, neutral index, drag release). */
  const select = (g: number | null, focus = false) => {
    interacted.current = true;
    setGear(g);
    setAnnounce(describe(g));
    api.current?.shiftTo(g);
    if (focus && g !== null) radioRefs.current[g - 1]?.focus();
  };

  useGSAP(
    (_, contextSafe) => {
      const plate = plateRef.current;
      const knob = knobRef.current;
      const face = faceRef.current;
      const num = numRef.current;
      const proxy = proxyRef.current;
      const trail = trailRef.current;
      const preview = previewRef.current;
      if (!plate || !knob || !face || !num || !proxy || !trail || !preview || !contextSafe) return;

      let scale = plate.clientWidth / VB.w || 1;
      gsap.set(knob, { left: 0, top: 0 });
      const place = () => {
        gsap.set(knob, { x: pos.current.x * scale, y: pos.current.y * scale });
        const label = knobLabel(pos.current);
        if (num.textContent !== label) num.textContent = label;
      };
      const ro = new ResizeObserver(() => {
        scale = plate.clientWidth / VB.w || 1;
        place();
      });
      ro.observe(plate);
      place();

      let travel: gsap.core.Timeline | null = null;

      const shiftTo = contextSafe((target: number | null) => {
        travel?.kill();
        gsap.killTweensOf(trail);
        gsap.set(preview, { opacity: 0 });
        const end = pointFor(target);

        if (reduced) {
          pos.current = { ...end };
          place();
          return;
        }

        const pts = route(pos.current, end);
        const len = pathLength(pts);
        if (len < 0.5) {
          pos.current = { ...end };
          place();
          return;
        }

        const duration = gsap.utils.clamp(0.32, 0.56, 0.28 + len * 0.0006);
        const s = { d: 0 };
        travel = gsap.timeline();
        travel.to(s, {
          d: len,
          duration,
          ease: "steer",
          onUpdate: () => {
            pos.current = pointAt(pts, s.d);
            place();
          },
        });

        // the road you just drove lights up orange, then fades back into the plate
        gsap.set(trail, { attr: { d: toPath(pts) }, opacity: 1 });
        travel.fromTo(trail, { drawSVG: "0% 0%" }, { drawSVG: "0% 100%", duration, ease: "steer" }, 0);
        travel.to(trail, { opacity: 0, duration: 0.7, ease: "road" }, duration + 0.12);

        if (target !== null) {
          // settle: the lever bumps 2 px past the slot end and springs back, like a detent catching
          const prev = pts[pts.length - 2] ?? pts[0];
          const seg = Math.hypot(end.x - prev.x, end.y - prev.y) || 1;
          const dir = { x: (end.x - prev.x) / seg, y: (end.y - prev.y) / seg };
          const over = 2 / scale;
          const o = { k: 0 };
          const apply = () => {
            pos.current = { x: end.x + dir.x * over * o.k, y: end.y + dir.y * over * o.k };
            place();
          };
          travel
            .to(o, { k: 1, duration: 0.07, ease: "power2.out", onUpdate: apply }, duration)
            .to(o, { k: 0, duration: 0.3, ease: "back.out(3)", onUpdate: apply })
            .fromTo(face, { scale: 1 }, { scale: 0.94, duration: 0.07, ease: "power2.out", yoyo: true, repeat: 1 }, duration);
        }
      });

      const previewTo = contextSafe((target: number | null | undefined) => {
        if (target === undefined || reduced) {
          gsap.to(preview, { opacity: 0, duration: 0.15, ease: "road", overwrite: true });
          return;
        }
        const pts = route(pos.current, pointFor(target));
        if (pathLength(pts) < 1) return;
        gsap.set(preview, { attr: { d: toPath(pts) } });
        gsap.to(preview, { opacity: 0.75, duration: 0.18, ease: "road", overwrite: true });
      });

      api.current = { shiftTo, preview: previewTo };

      // ── drag: a hidden proxy follows the pointer, the knob chases it along the gate ──
      let dragging = false;
      const chase = () => {
        const target = nearestOnGate({ x: Number(gsap.getProperty(proxy, "x")) / scale, y: Number(gsap.getProperty(proxy, "y")) / scale });
        const pts = route(pos.current, target);
        const len = pathLength(pts);
        if (len < 0.05) return;
        const k = 1 - Math.pow(1 - 0.32, gsap.ticker.deltaRatio(60));
        pos.current = pointAt(pts, len * k);
        place();
      };

      let kit: DragKit | null = null;
      let drag: InstanceType<DragKit["Draggable"]> | null = null;
      let dead = false;

      const release = contextSafe(() => {
        gsap.ticker.remove(chase);
        gsap.to(face, { scale: 1, duration: 0.2, ease: "road" });
        if (!kit) return;
        if (!dragging) {
          kit.InertiaPlugin.untrack(proxy);
          return;
        }
        dragging = false;
        const vy = kit.InertiaPlugin.getVelocity(proxy, "y") / scale; // viewBox units per second
        kit.InertiaPlugin.untrack(proxy);

        const c = pos.current;
        let slot = 0;
        for (let i = 1; i < SLOT_X.length; i++) if (Math.abs(SLOT_X[i] - c.x) < Math.abs(SLOT_X[slot] - c.x)) slot = i;
        const atSlot = Math.abs(c.x - SLOT_X[slot]) < 12;

        let target: number | null;
        if (Math.abs(c.y - Y_N) <= NEUTRAL_ZONE) {
          // a flick up or down at a slot mouth throws it into gear; otherwise it rests in neutral
          target = atSlot && Math.abs(vy) > 420 ? slot * 2 + (vy < 0 ? 1 : 2) : null;
        } else {
          const top = c.y < Y_N;
          const flickedBack = (top && vy > 650) || (!top && vy < -650);
          target = flickedBack ? null : slot * 2 + (top ? 1 : 2);
        }
        select(target);
      });

      const attach = contextSafe((k: DragKit) => {
        kit = k;
        [drag] = k.Draggable.create(proxy, {
          type: "x,y",
          trigger: knob,
          cursor: "grab",
          activeCursor: "grabbing",
          minimumMovement: 2,
          zIndexBoost: false,
          onPress: () => {
            travel?.kill();
            interacted.current = true;
            gsap.set(proxy, { x: pos.current.x * scale, y: pos.current.y * scale });
            drag?.update();
            k.InertiaPlugin.track(proxy, "x,y");
            gsap.to(face, { scale: 1.06, duration: 0.18, ease: "road" });
          },
          onDragStart: () => {
            dragging = true;
            gsap.set(preview, { opacity: 0 });
            gsap.ticker.add(chase);
          },
          onRelease: release,
        });
      });
      loadDragKit().then((k) => {
        if (!dead) attach(k);
      });

      // ── entrance: the contours print from the summit down, the gate is cut from its centres outward,
      //    then labels and knob seat, then one teaching shift ──
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const teach = contextSafe(() => {
          if (interacted.current) return;
          setGear(2);
          shiftTo(2);
          gsap.delayedCall(1.1, () => {
            if (interacted.current) return;
            setGear(1);
            shiftTo(1);
          });
        });

        const tl = gsap.timeline({ scrollTrigger: { trigger: plate, start: "top 72%", once: true } });
        tl.from(plate.querySelectorAll("[data-ring]"), { opacity: 0, duration: 0.6, stagger: 0.05, ease: "road", clearProps: "opacity" }, 0)
          .from(
            plate.querySelectorAll("[data-gate]"),
            {
              drawSVG: "50% 50%",
              duration: 0.9,
              ease: "steer",
              stagger: 0.07,
              clearProps: "strokeDasharray,strokeDashoffset",
            },
            0,
          )
          .from(face, { scale: 0.82, opacity: 0, duration: 0.4, ease: "back.out(2.2)" }, 0.45)
          // opacity only: the labels are centred with CSS translate, which a GSAP transform tween would take over
          .from(plate.querySelectorAll("[data-gear-label]"), { opacity: 0, duration: 0.4, stagger: 0.05, ease: "road", clearProps: "opacity" }, 0.5)
          .add(teach, "+=0.35");
      });

      return () => {
        dead = true;
        ro.disconnect();
        gsap.ticker.remove(chase);
        drag?.kill();
        travel?.kill();
        mm.revert();
        api.current = null;
      };
    },
    { scope: rootRef, dependencies: [reduced], revertOnUpdate: true },
  );

  const onGroupKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = gear ?? 0;
    let next: number | null | undefined;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = cur >= GEAR_COUNT ? 1 : cur + 1;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = cur <= 1 ? GEAR_COUNT : cur - 1;
    else if (e.key === "Home") next = 1;
    else if (e.key === "End") next = GEAR_COUNT;
    else if (/^[1-6]$/.test(e.key)) next = Number(e.key);
    else if (e.key === "n" || e.key === "N" || e.key === "0") next = null;
    if (next === undefined) return;
    e.preventDefault();
    if (next === gear) return;
    select(next, true);
  };

  const tabStop = gear ?? 1;

  return (
    <div ref={rootRef} className="contents">
      <div className="lg:col-span-5 lg:row-start-2">
        <div ref={plateRef} className="relative mx-auto aspect-[360/420] w-full max-w-[30rem] select-none">
          <svg aria-hidden="true" viewBox={`0 0 ${VB.w} ${VB.h}`} className="absolute inset-0 size-full overflow-visible">
            <defs>
              {/* the contours fade out before the label bands, so gear names never sit on linework */}
              <linearGradient id="gearbox-plate-fade" gradientUnits="userSpaceOnUse" x1="0" y1="18" x2="0" y2={VB.h - 18}>
                <stop offset="0.1" stopColor="#fff" stopOpacity="0" />
                <stop offset="0.24" stopColor="#fff" />
                <stop offset="0.76" stopColor="#fff" />
                <stop offset="0.9" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
              <mask id="gearbox-plate-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={VB.w} height={VB.h}>
                <rect x="18" y="18" width={VB.w - 36} height={VB.h - 36} rx="20" fill="url(#gearbox-plate-fade)" />
              </mask>
            </defs>

            {/* the plate: a survey sheet on the paper, Rock Blue neatline (outer rule plus a finer inner rule) */}
            <rect x="6" y="6" width={VB.w - 12} height={VB.h - 12} rx="30" fill="none" className="stroke-rock" strokeWidth="1.5" />
            <rect x="18" y="18" width={VB.w - 36} height={VB.h - 36} rx="20" fill="none" className="stroke-rock" strokeOpacity="0.55" strokeWidth="0.75" />

            {/* a summit under the gate: Rock Blue contours, every 5th an index contour */}
            <g mask="url(#gearbox-plate-mask)" fill="none" className="stroke-rock">
              {PLATE_RINGS.map((r) => (
                <path key={r.d} data-ring d={r.d} strokeWidth={r.index ? 1.25 : 1} strokeOpacity={r.index ? 1 : 0.55} />
              ))}
            </g>

            {/* gate: every ink groove first, then every paper centre line, so the lines cross cleanly where the
                channel meets a slot. One path per slot so each can be cut from its middle on entrance. */}
            {/* opacity on the group, not the strokes, so the junctions do not double up darker */}
            <g opacity="0.85">
              {GATE_SEGMENTS.map((d) => (
                <path key={`ink-${d}`} data-gate d={d} className="stroke-ink" strokeWidth="10" strokeLinecap="round" fill="none" />
              ))}
            </g>
            {GATE_SEGMENTS.map((d) => (
              <path key={`line-${d}`} data-gate d={d} className="stroke-paper" strokeWidth="1.25" strokeLinecap="round" fill="none" />
            ))}

            <text
              x={SLOT_X[0] - 30}
              y={Y_N + 4}
              className="fill-ink"
              fillOpacity="0.7"
              fontSize="12"
              textAnchor="middle"
              style={{ fontFamily: "var(--font-jetbrains), ui-monospace, monospace" }}
            >
              N
            </text>

            {/* route preview on hover, and the trail of the last shift */}
            <path ref={previewRef} d="" fill="none" className="stroke-route" strokeWidth="2" strokeDasharray="3 5" strokeLinecap="round" opacity="0" />
            <path ref={trailRef} d="" fill="none" className="stroke-route" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0" />
          </svg>

          <div role="radiogroup" aria-label="Gear" aria-describedby="gearbox-hint" aria-controls="gearbox-panel" onKeyDown={onGroupKey}>
            {gears.map((g, i) => {
              const n = i + 1;
              const p = gearPoint(n);
              const top = n % 2 === 1;
              const checked = gear === n;
              return (
                <button
                  key={g.gear}
                  ref={(el) => {
                    radioRefs.current[i] = el;
                  }}
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  tabIndex={tabStop === n ? 0 : -1}
                  data-gear-label
                  onClick={() => {
                    if (!checked) select(n);
                  }}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse" && !checked) api.current?.preview(n);
                  }}
                  onPointerLeave={(e) => {
                    if (e.pointerType === "mouse") api.current?.preview(undefined);
                  }}
                  className={`group/gear absolute z-10 flex min-h-11 min-w-11 w-max max-w-[7.5rem] items-center gap-1 rounded-md px-1.5 py-1 text-center text-ink transition-[scale] duration-150 ease-out active:scale-[0.97] ${
                    top ? "-translate-x-1/2 -translate-y-full flex-col" : "-translate-x-1/2 flex-col-reverse"
                  }`}
                  style={{ left: pct(p.x, VB.w), top: pct(top ? p.y - LABEL_GAP : p.y + LABEL_GAP, VB.h) }}
                >
                  <span className="sr-only">Gear </span>
                  <span
                    className={`text-[13px] font-medium leading-tight transition-opacity duration-200 ${checked ? "opacity-100" : "opacity-70 group-hover/gear:opacity-100"}`}
                  >
                    {g.name}
                  </span>
                  <span className="relative font-display text-[1.6rem] font-[720] leading-none">
                    {g.gear}
                    <span
                      aria-hidden="true"
                      className={`absolute left-1/2 h-[3px] w-4 -translate-x-1/2 rounded-full bg-route transition-[opacity,scale] duration-200 ease-out ${
                        top ? "-bottom-2" : "-top-2"
                      } ${checked ? "scale-100 opacity-100" : "scale-50 opacity-0"}`}
                    />
                  </span>
                </button>
              );
            })}
          </div>

          {/* knob: positioned by transform from the gate geometry; pointer-only (keyboard uses the radios) */}
          <div
            ref={knobRef}
            data-cursor
            data-cursor-label="Drag"
            aria-hidden="true"
            className="absolute z-20 -ml-[22px] -mt-[22px] size-[44px] touch-none"
            // server/no-JS position: seated in gear 1; on mount GSAP moves the origin to 0,0 and drives x/y
            style={{ left: pct(SLOT_X[0], VB.w), top: pct(Y_TOP, VB.h) }}
          >
            <div
              ref={faceRef}
              className="relative grid size-full place-items-center rounded-full bg-ink text-paper shadow-[0_10px_20px_-10px_color-mix(in_srgb,var(--color-ink)_75%,transparent)]"
            >
              <span className="absolute inset-[5px] rounded-full border-[1.5px] border-paper/80" />
              <span ref={numRef} className="relative font-display text-[0.95rem] font-[720] leading-none">
                1
              </span>
            </div>
          </div>
          <div ref={proxyRef} aria-hidden="true" className="pointer-events-none absolute left-0 top-0 size-px opacity-0" />
        </div>

        <p id="gearbox-hint" className="mx-auto mt-6 max-w-[30rem] text-center text-[0.875rem] text-ink/75">
          Drag the knob through the gate, or pick a gear.<span className="[@media(hover:none)]:hidden"> Keys 1–6 shift too.</span>
        </p>
      </div>

      <div className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1 lg:self-center">
        <GearPanel id="gearbox-panel" gear={gear} onSelect={(g) => select(g, true)} />
        <p className="sr-only" aria-live="polite">
          {announce}
        </p>
      </div>
    </div>
  );
}
