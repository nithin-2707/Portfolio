"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { areas } from "@/content/areas";
import { gsap } from "@/lib/gsap";
import { heroReady, launched } from "@/lib/stores";
import { launchExit } from "@/components/launch/phase";
import { useReducedMotion } from "@/lib/useReducedMotion";
import {
  CX,
  CY,
  DS,
  LAP,
  N,
  NX,
  NY,
  RACE_D,
  ROFF,
  TRACK_D,
  VBH,
  VBW,
  VPROF,
  nearestSample,
  offsetPt,
  sectorMid,
  sectorOf,
} from "./geometry";
import {
  BADGE_SPOTS,
  GRID_D,
  GRID_SLOTS,
  KERBS,
  LABEL_SPOTS,
  PIT_BOXES,
  PIT_D,
  PIT_LABEL,
  RACE_WINDOWS,
  RUNOFF,
  SECTOR_TICKS,
  SF,
  TRACK_WINDOWS,
  TURN_LABELS,
} from "./drawing";
import { CIRCUIT_CSS } from "./circuit.css";

/**
 * The circuit map: my five areas of work as the five sectors of one lap.
 *
 * - Idle, the car laps on the racing line (a small lap simulation: it brakes, turns in, accelerates out) and
 *   whichever sector it is in is cued: the stretch's ink thickens, an orange racing line draws through it,
 *   its label inks in and the timing panel shows the proof line, where, and the tools.
 * - Fine pointers: the nearest point of the track to the pointer cues its sector, and the car drives there along
 *   the track, the short way round. 1.2 s after the pointer leaves, the car laps on from wherever it is.
 * - Touch: tap a sector or its label. Keyboard: the sector labels are buttons.
 * - Entrance: the track draws itself in, the five pips light like start lights, lights out, the car rolls off
 *   the grid. Reduced motion: everything is printed and still, sector 1 is cued, the car sits on pole.
 */

const CAR_SCALE = 1.6;
/** The car rides a touch inside the drawn racing line, so its wheels stay on the kerb at the apex. */
const CAR_LINE = 0.72;
const LAP_PACE = 1; // multiplier on the simulated speed profile
const SEEK_VMAX = 470;
const SEEK_ACC = 620;
const SEEK_DEC = 360;

type Mode = "lap" | "seek";

const wrapS = (s: number) => ((s % LAP) + LAP) % LAP;
const wrapI = (i: number) => ((i % N) + N) % N;
const wrapDelta = (d: number) => {
  const w = wrapS(d);
  return w > LAP / 2 ? w - LAP : w;
};
const angDiff = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const r1 = (n: number) => Math.round(n * 10) / 10;

/** Car pose on the grid (pole slot), for the server HTML and reduced motion. */
const POLE = GRID_SLOTS[0];
const POLE_POSE = (() => {
  const [x, y] = offsetPt(POLE.i, POLE.off);
  const deg = (Math.atan2(CY[wrapI(POLE.i + 2)] - CY[wrapI(POLE.i - 2)], CX[wrapI(POLE.i + 2)] - CX[wrapI(POLE.i - 2)]) * 180) / Math.PI;
  return { x, y, deg };
})();
const carTransform = (x: number, y: number, deg: number) =>
  `translate(${r1(x)} ${r1(y)}) rotate(${r1(deg)}) scale(${CAR_SCALE}) translate(-18 -10)`;

/** Draw the orange racing line through sector k, from its start, like a pen. */
function drawRace(el: SVGUseElement | null | undefined, k: number) {
  if (!el) return;
  const { len } = RACE_WINDOWS[k];
  gsap.fromTo(
    el,
    { attr: { "stroke-dasharray": `0.0001 ${1 - 0.0001}` } },
    { attr: { "stroke-dasharray": `${len} ${1 - len}` }, duration: 0.85, ease: "road", overwrite: true },
  );
}

function Car({ carRef }: { carRef: React.RefObject<SVGGElement | null> }) {
  return (
    <g ref={carRef} className="cm-car" data-brake="false" transform={carTransform(POLE_POSE.x, POLE_POSE.y, POLE_POSE.deg)}>
      {/* the same car as the cursor's: top-down, nose to the right */}
      <rect className="cm-car-tyre" x="7" y="0" width="6" height="3" rx="1" />
      <rect className="cm-car-tyre" x="23" y="0" width="6" height="3" rx="1" />
      <rect className="cm-car-tyre" x="7" y="17" width="6" height="3" rx="1" />
      <rect className="cm-car-tyre" x="23" y="17" width="6" height="3" rx="1" />
      <path className="cm-car-body" d="M3 6.2C3 3.6 4.6 2 7.2 2H25.6C30.2 2 33.4 5.4 34 10C33.4 14.6 30.2 18 25.6 18H7.2C4.6 18 3 16.4 3 13.8Z" />
      <rect x="4" y="8.6" width="29" height="2.8" rx="1.4" className="cm-car-stripe" />
      <path className="cm-car-glass" d="M21.5 4.4H24.6C26.6 5.6 27.6 7.6 27.8 10C27.6 12.4 26.6 14.4 24.6 15.6H21.5Z" />
      <path className="cm-car-glass" d="M8.2 4.6H10.6V15.4H8.2C7.6 13.6 7.4 11.8 7.4 10C7.4 8.2 7.6 6.4 8.2 4.6Z" />
      <rect className="cm-car-tail" x="2.4" y="4.2" width="1.8" height="3.4" rx="0.8" />
      <rect className="cm-car-tail" x="2.4" y="12.4" width="1.8" height="3.4" rx="0.8" />
    </g>
  );
}

function Compass() {
  const cx = 950;
  const cy = 60;
  return (
    <g className="cm-compass" data-intro-fade>
      <circle cx={cx} cy={cy} r="24" className="cm-hair" />
      <path d={`M${cx} ${cy - 21}L${cx - 6} ${cy + 3}L${cx} ${cy}Z`} className="cm-ink-fill" />
      <path d={`M${cx} ${cy - 21}L${cx + 6} ${cy + 3}L${cx} ${cy}Z`} className="cm-paper-fill cm-hair-solid" />
      <path d={`M${cx} ${cy + 21}L${cx - 6} ${cy - 3}L${cx} ${cy}L${cx + 6} ${cy - 3}Z`} className="cm-paper-fill cm-hair-solid" />
      <path d={`M${cx - 30} ${cy}H${cx - 26}M${cx + 26} ${cy}H${cx + 30}M${cx} ${cy + 26}V${cy + 30}`} className="cm-hair-solid" />
      <text x={cx} y={cy - 32} className="cm-compass-n" textAnchor="middle">
        N
      </text>
    </g>
  );
}

function ScaleBar() {
  const x = 40;
  const y = 806;
  const seg = 30;
  return (
    <g className="cm-scale" data-intro-fade>
      {[0, 1, 2, 3].map((k) => (
        <rect key={k} x={x + k * seg} y={y} width={seg} height="6" className={k % 2 === 0 ? "cm-ink-fill" : "cm-paper-fill"} />
      ))}
      <rect x={x} y={y} width={seg * 4} height="6" className="cm-hair-solid" fill="none" />
      <text x={x} y={y - 8} className="cm-scale-t">
        0
      </text>
      <text x={x + seg * 2} y={y - 8} className="cm-scale-t" textAnchor="middle">
        100
      </text>
      <text x={x + seg * 4} y={y - 8} className="cm-scale-t" textAnchor="middle">
        200 m
      </text>
    </g>
  );
}

export function CircuitMap() {
  const reduced = useReducedMotion();
  const [cued, setCued] = useState(0);
  const [mode, setMode] = useState<Mode>("lap");
  const [lights, setLights] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<SVGGElement>(null);
  const raceRefs = useRef<(SVGUseElement | null)[]>([]);
  /** imperative controls, filled by the engine effect */
  const ctl = useRef<{
    pointAt: (clientX: number, clientY: number, holdMs: number) => void;
    cueSector: (k: number, holdMs: number) => void;
    hold: () => void;
    release: (ms: number) => void;
  } | null>(null);

  // ── size: `--u` is one screen pixel in sheet units, so hairlines and map type keep their size on screen ──
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sheet = sheetRef.current;
    if (!root || !sheet) return;
    const measure = () => {
      const w = sheet.getBoundingClientRect().width;
      if (w) root.style.setProperty("--u", (VBW / w).toFixed(3));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(sheet);
    return () => ro.disconnect();
  }, []);

  // ── the loader waits for the hero: one painted frame is enough here ──
  useEffect(() => {
    if (reduced) {
      heroReady.set(true);
      return;
    }
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => heroReady.set(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [reduced]);

  // ── the engine and the entrance. A layout effect, so the entrance is armed before paint; one gsap context,
  //    so an unmount (or React's dev double-mount) reverts every inline style it set. One rAF loop drives the
  //    car, paused off-screen and in hidden tabs. ──
  useLayoutEffect(() => {
    const root = rootRef.current;
    const sheet = sheetRef.current;
    const car = carRef.current;
    if (!root || !sheet || !car) return;

    const e = {
      s: wrapS(POLE.i * DS),
      lat: POLE.off,
      v: 0,
      x: POLE_POSE.x,
      y: POLE_POSE.y,
      heading: (POLE_POSE.deg * Math.PI) / 180,
      facing: 1,
      mode: "grid" as "grid" | Mode | "still",
      target: 0,
      resumeAt: 0,
      cue: 0,
      brake: false,
      /** still behind the start line on the opening lap: the grid belongs to sector 1, not to the end of sector 5 */
      onGrid: true,
      /** how long the car has been rolling against the way it faces */
      against: 0,
      /** unattended laps since the last pointer, tap or key: after two the car parks (moving content stops by itself) */
      laps: 0,
    };
    let lastMode: Mode = "lap";
    const setEngineMode = (m: "grid" | Mode | "still") => {
      e.mode = m;
      if ((m === "lap" || m === "seek") && m !== lastMode) {
        lastMode = m;
        setMode(m);
      }
    };
    const cue = (k: number) => {
      if (k === e.cue) return;
      e.cue = k;
      setCued(k);
    };

    // reduced motion: printed and still; the cue still follows the pointer, keys and taps
    if (reduced) {
      e.mode = "still";
      ctl.current = {
        pointAt: (clientX, clientY) => {
          const r = sheet.getBoundingClientRect();
          cue(sectorOf(nearestSample(((clientX - r.left) / r.width) * VBW, ((clientY - r.top) / r.height) * VBH, 3)));
        },
        cueSector: (k) => cue(k),
        hold: () => {},
        release: () => {},
      };
      return () => {
        ctl.current = null;
      };
    }

    const place = () => {
      const deg = (e.heading * 180) / Math.PI;
      car.setAttribute("transform", carTransform(e.x, e.y, deg));
    };

    const seekTo = (s: number, holdMs: number) => {
      e.laps = 0;
      e.target = wrapS(s);
      e.resumeAt = holdMs === Infinity ? Infinity : performance.now() + holdMs;
      if (e.mode !== "grid") setEngineMode("seek");
    };

    ctl.current = {
      pointAt: (clientX, clientY, holdMs) => {
        e.onGrid = false;
        const r = sheet.getBoundingClientRect();
        const i = nearestSample(((clientX - r.left) / r.width) * VBW, ((clientY - r.top) / r.height) * VBH, 3);
        cue(sectorOf(i));
        seekTo(i * DS, holdMs);
      },
      cueSector: (k, holdMs) => {
        e.onGrid = false;
        cue(k);
        seekTo(sectorMid(k) * DS, holdMs);
      },
      hold: () => {
        if (e.mode === "seek") e.resumeAt = Infinity;
      },
      release: (ms) => {
        if (e.mode === "seek") e.resumeAt = performance.now() + ms;
      },
    };

    const step = (dt: number, now: number) => {
      if (e.mode === "grid") return;
      if (e.mode === "seek" && now >= e.resumeAt) setEngineMode("lap");

      const prevV = e.v;
      if (e.mode === "lap") {
        const f = e.s / DS;
        const i0 = Math.floor(f) % N;
        const vt = (VPROF[i0] + (VPROF[(i0 + 1) % N] - VPROF[i0]) * (f - Math.floor(f))) * LAP_PACE;
        const dv = vt - e.v;
        e.v += Math.min(Math.max(dv, -170 * dt), 78 * dt);
      } else {
        const delta = wrapDelta(e.target - e.s);
        const dist = Math.abs(delta);
        // trapezoid with a soft landing: accelerate, cruise, then an ease-out arrival
        const want = Math.sign(delta) * Math.min(SEEK_VMAX, Math.sqrt(2 * SEEK_DEC * dist), dist * 3.2);
        const dv = want - e.v;
        e.v += Math.min(Math.max(dv, -SEEK_ACC * dt), SEEK_ACC * dt);
        if (dist < 0.4 && Math.abs(e.v) < 4) e.v = 0;
      }
      const before = e.s;
      e.s = wrapS(e.s + e.v * dt);
      // a lap is counted at the start line; after two unattended laps the car pulls up on sector 1 and waits
      if (e.mode === "lap" && e.v > 0 && e.s < before - (N * DS) / 2) {
        e.laps += 1;
        if (e.laps >= 2) {
          cue(0);
          seekTo(sectorMid(0) * DS, Infinity);
          e.laps = 2;
        }
      }

      // a short shuffle back is a reverse; a real drive the other way turns the car round
      if (Math.abs(e.v) > 55 && Math.sign(e.v) !== e.facing) {
        e.against += dt;
        if (e.against > 0.2) {
          e.facing = Math.sign(e.v);
          e.against = 0;
        }
      } else e.against = 0;

      // position: centreline + a lateral offset that eases onto the racing line
      const f = e.s / DS;
      const i0 = Math.floor(f) % N;
      const i1 = (i0 + 1) % N;
      const t = f - Math.floor(f);
      const cx = CX[i0] + (CX[i1] - CX[i0]) * t;
      const cy = CY[i0] + (CY[i1] - CY[i0]) * t;
      const nx = NX[i0] + (NX[i1] - NX[i0]) * t;
      const ny = NY[i0] + (NY[i1] - NY[i0]) * t;
      const roff = (ROFF[i0] + (ROFF[i1] - ROFF[i0]) * t) * CAR_LINE;
      // a car only changes line while it is rolling
      e.lat += (roff - e.lat) * (1 - Math.exp(-dt * 2.4 * Math.min(1, Math.abs(e.v) / 60)));
      const x = cx + nx * e.lat;
      const y = cy + ny * e.lat;
      const mx = x - e.x;
      const my = y - e.y;
      e.x = x;
      e.y = y;

      // steer: face the direction of travel (or away from it when reversing a short way), damped
      if (Math.abs(e.v) > 3 && Math.hypot(mx, my) > 0.05) {
        const vel = Math.atan2(my, mx);
        const want = Math.sign(e.v) === e.facing ? vel : vel + Math.PI;
        e.heading += angDiff(want - e.heading) * (1 - Math.exp(-dt * 11));
      }
      place();

      // tail lights come on under braking
      const braking = e.v - prevV < -55 * dt && Math.abs(e.v) > 20;
      if (braking !== e.brake) {
        e.brake = braking;
        car.dataset.brake = braking ? "true" : "false";
      }

      if (e.onGrid && f < N / 2) e.onGrid = false;
      if (e.mode === "lap") cue(e.onGrid ? 0 : sectorOf(f));
    };

    // ── loop gating ──
    let raf = 0;
    let last = 0;
    let inView = true;
    const loop = (tms: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((tms - last) / 1000, 1 / 20);
      last = tms;
      step(dt, tms);
    };
    const start = () => {
      if (raf || !inView || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { rootMargin: "80px 0px" },
    );
    io.observe(root);
    const onVis = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVis);

    // ── entrance: draw the track, light the pips, lights out, roll off the grid ──
    const ctx = gsap.context(() => {}, root);
    const armed = !(launched.get() || launchExit.get());
    let started = false;
    if (armed) {
      // under the launch sheet: hide what will be drawn, so the hero opens on an empty sheet
      root.dataset.intro = "armed";
      ctx.add(() => {
        gsap.set("[data-intro-draw]", { drawSVG: "0% 0%" });
        gsap.set("[data-intro-fade], [data-intro-label], .cm-car, .cm-panel, .cm-title", { autoAlpha: 0 });
      });
    } else {
      setEngineMode("lap");
    }
    const go = () => {
      if (!armed || started) return;
      started = true;
      ctx.add(() => {
        const tl = gsap.timeline();
        // the pen draws the lap from the start line; the printed furniture follows once the road is down
        tl.to("[data-intro-draw]", { drawSVG: "0% 100%", duration: 1.35, ease: "steer" }, 0);
        tl.to("[data-intro-fade]", { autoAlpha: 1, duration: 0.45, stagger: 0.04, ease: "road" }, 1.0);
        tl.to(".cm-title", { autoAlpha: 1, duration: 0.6, ease: "road" }, 0.5);
        tl.to("[data-intro-label]", { autoAlpha: 1, duration: 0.5, stagger: 0.06, ease: "road" }, 1.15);
        tl.to(car, { autoAlpha: 1, duration: 0.4, ease: "road" }, 1.3);
        tl.to(".cm-panel", { autoAlpha: 1, duration: 0.5, ease: "road" }, 1.35);
        // five pips light like start lights, then lights out
        const LIGHTS = 1.5;
        const GAP = 0.16;
        for (let k = 1; k <= 5; k++) tl.call(() => setLights(k), [], LIGHTS + (k - 1) * GAP);
        tl.call(
          () => {
            setLights(0);
            delete root.dataset.intro;
            setEngineMode("lap");
            drawRace(raceRefs.current[0], 0);
          },
          [],
          LIGHTS + 4 * GAP + 0.38,
        );
      });
    };
    const offExit = launchExit.subscribe(() => launchExit.get() && go());
    const offLaunched = launched.subscribe(() => launched.get() && go());

    place();
    start();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      offExit();
      offLaunched();
      ctx.revert();
      delete root.dataset.intro;
      setLights(0);
      ctl.current = null;
    };
  }, [reduced]);

  // ── the orange racing line draws through each newly cued sector ──
  const firstCue = useRef(true);
  useEffect(() => {
    if (firstCue.current) {
      firstCue.current = false;
      return;
    }
    if (!reduced) drawRace(raceRefs.current[cued], cued);
  }, [cued, reduced]);

  // ── input ──
  const lastPointer = useRef<string>("mouse");
  const onPointerDown = (ev: ReactPointerEvent) => {
    lastPointer.current = ev.pointerType;
  };
  const onPointerMove = (ev: ReactPointerEvent) => {
    if (ev.pointerType === "touch") return;
    const target = ev.target as Element;
    if (target.closest(".cm-panel")) return ctl.current?.hold();
    const label = target.closest<HTMLElement>("[data-sector]");
    if (label) return ctl.current?.cueSector(Number(label.dataset.sector), Infinity);
    ctl.current?.pointAt(ev.clientX, ev.clientY, Infinity);
  };
  const onPointerLeave = (ev: ReactPointerEvent) => {
    if (ev.pointerType === "touch") return;
    ctl.current?.release(1200);
  };
  const onSheetClick = (ev: React.MouseEvent) => {
    if ((ev.target as Element).closest("[data-sector], .cm-panel")) return;
    if (lastPointer.current === "mouse") return;
    ctl.current?.pointAt(ev.clientX, ev.clientY, 3500);
  };
  const sectorButtonProps = (k: number) => ({
    "data-sector": k,
    onFocus: () => ctl.current?.cueSector(k, Infinity),
    onBlur: () => ctl.current?.release(1200),
    onClick: () => ctl.current?.cueSector(k, lastPointer.current === "mouse" ? Infinity : 3500),
    "aria-describedby": `circuit-area-${areas[k].id}`,
  });

  const pipState = (k: number) =>
    lights > 0 ? (k < lights ? "light" : "off") : k === cued ? "active" : mode === "lap" && k < cued ? "done" : "off";

  return (
    <div ref={rootRef} className="cm">
      <style href="circuit-map" precedence="medium">
        {CIRCUIT_CSS}
      </style>

      <div className="cm-title">
        <h2 className="cm-title-h">What I work on</h2>
        <p className="cm-title-p">
          One lap, five sectors. <span className="cm-hint-fine">Point at the track.</span>
          <span className="cm-hint-coarse">Tap a sector.</span>
        </p>
      </div>

      <div
        ref={sheetRef}
        className="cm-sheet"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerLeave}
        onClick={onSheetClick}
      >
        <svg viewBox={`0 0 ${VBW} ${VBH}`} className="cm-svg" aria-hidden="true" focusable="false">
          <defs>
            <pattern id="cm-hatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="7" className="cm-hatch-line" />
            </pattern>
            <pattern id="cm-chq" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" className="cm-paper-fill" />
              <rect width="5" height="5" className="cm-ink-fill" />
              <rect x="5" y="5" width="5" height="5" className="cm-ink-fill" />
            </pattern>
            {/* the shared paths (pathLength 1, so a sector is a dash window on them) */}
            <path id="cm-track-1" d={TRACK_D} pathLength={1} />
            <path id="cm-race-1" d={RACE_D} pathLength={1} />
            <filter id="cm-car-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="1.6" stdDeviation="1.4" floodColor="#0e2f44" floodOpacity="0.3" />
            </filter>
          </defs>

          {/* gravel traps */}
          <g data-intro-fade>
            {RUNOFF.map((d, k) => (
              <path key={k} d={d} className="cm-runoff" />
            ))}
          </g>

          {/* pit lane, boxes and building */}
          <g data-intro-fade>
            <path d={PIT_D} className="cm-pit-edge" />
            <path d={PIT_D} className="cm-pit-surface" />
            <g className="cm-detail">
              <path d={PIT_BOXES} className="cm-hair-solid" />
              <text x={PIT_LABEL.x} y={PIT_LABEL.y} className="cm-pit-t" textAnchor="middle" dominantBaseline="central">
                PIT
              </text>
            </g>
          </g>

          {/* the track: ink edges (the stroke under) and the surface (the stroke over) */}
          <path d={TRACK_D} className="cm-trk-edge" data-intro-draw />
          {TRACK_WINDOWS.map((w, k) => (
            <use
              key={k}
              href="#cm-track-1"
              className="cm-trk-lift"
              data-on={k === cued ? "true" : "false"}
              strokeDasharray={w.dash}
              strokeDashoffset={w.offset}
            />
          ))}
          <path d={TRACK_D} className="cm-trk-surface" data-intro-draw />

          {/* kerbs */}
          <g data-intro-fade>
            {KERBS.map((d, k) => (
              <g key={k}>
                <path d={d} className="cm-kerb-base" />
                <path d={d} className="cm-kerb" />
              </g>
            ))}
          </g>

          {/* the racing line, dotted all the way round */}
          <path d={RACE_D} className="cm-race-dots" data-intro-fade />

          {/* grid, chequer and sector ticks */}
          <g data-intro-fade>
            <path d={GRID_D} className="cm-grid cm-detail" />
            <rect
              x={-SF.w / 2}
              y={-SF.h / 2}
              width={SF.w}
              height={SF.h}
              fill="url(#cm-chq)"
              transform={`translate(${SF.x} ${SF.y}) rotate(${SF.angle})`}
            />
            <path d={SECTOR_TICKS} className="cm-tick" />
          </g>

          {/* the cued sector's racing line, in route orange */}
          {RACE_WINDOWS.map((w, k) => (
            <use
              key={k}
              ref={(el) => {
                raceRefs.current[k] = el;
              }}
              href="#cm-race-1"
              className="cm-race-on"
              data-on={k === cued ? "true" : "false"}
              strokeDasharray={`${w.len} ${1 - w.len}`}
              strokeDashoffset={-w.from}
            />
          ))}

          {/* turn numbers */}
          <g className="cm-turns" data-intro-fade>
            {TURN_LABELS.map((t) => (
              <text key={t.n} x={t.x} y={t.y} textAnchor="middle" dominantBaseline="central">
                {t.n}
              </text>
            ))}
          </g>

          {/* compact maps number the sectors on the drawing; the key below names them */}
          <g className="cm-badges" data-intro-fade>
            {BADGE_SPOTS.map((b, k) => (
              <g key={k} transform={`translate(${b.x} ${b.y})`} data-on={k === cued ? "true" : "false"}>
                <circle r="19" />
                <text textAnchor="middle" dominantBaseline="central">
                  {k + 1}
                </text>
              </g>
            ))}
          </g>

          <Compass />
          <ScaleBar />

          <g filter="url(#cm-car-shadow)">
            <Car carRef={carRef} />
          </g>
        </svg>

        {/* the sector labels: real buttons, printed beside their stretch */}
        <ul className="cm-labels" aria-label="Sectors of the circuit">
          {areas.map((a, k) => {
            const spot = LABEL_SPOTS[k];
            const style: CSSProperties = { left: `${(spot.x / VBW) * 100}%`, top: `${(spot.y / VBH) * 100}%` };
            return (
              <li key={a.id} className="cm-label-li" style={style} data-align={spot.align} data-intro-label>
                <button
                  type="button"
                  className="cm-label"
                  data-on={k === cued ? "true" : "false"}
                  {...sectorButtonProps(k)}
                >
                  <span className="cm-num" aria-hidden="true">
                    {k + 1}
                  </span>
                  <span>{a.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* key for compact maps */}
      <ul className="cm-key" aria-label="Sectors of the circuit">
        {areas.map((a, k) => (
          <li key={a.id}>
            <button type="button" className="cm-label" data-on={k === cued ? "true" : "false"} {...sectorButtonProps(k)}>
              <span className="cm-num" aria-hidden="true">
                {k + 1}
              </span>
              <span>{a.label}</span>
            </button>
          </li>
        ))}
      </ul>

      {/* the timing panel: the cued sector, printed like a legend plate */}
      <div className="cm-panel" aria-hidden="true">
        <div className="cm-pips">
          {areas.map((a, k) => (
            <span key={a.id} className="cm-pip" data-state={pipState(k)} />
          ))}
        </div>
        <div className="cm-cards">
          {areas.map((a, k) => (
            <div key={a.id} className="cm-card" data-on={k === cued ? "true" : "false"}>
              <p className="cm-kicker">
                Sector {k + 1} of {areas.length}
              </p>
              <p className="cm-name">{a.label}</p>
              <p className="cm-proof">{a.proof}</p>
              <p className="cm-where">{a.where}</p>
              <ul className="cm-tools">
                {a.tools.map((tool) => (
                  <li key={tool}>{tool}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
