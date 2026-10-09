"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { heroReady, launched, launchTime, useLaunched } from "@/lib/stores";
import { prefersReducedMotion } from "@/lib/useReducedMotion";
import { launchExit } from "./phase";

/**
 * Launch control. A sports-car rev counter: the needle climbs while the page gets ready, holds just under the
 * redline revving, and once everything is in it snaps into the orange band, bounces off the limiter, the shift
 * lights flash, the gear indicator drops from N into 1, and the site opens through the centre of the dial.
 *
 * Honest about loading: the finish waits for the fonts, the window load and the hero's first painted frame
 * (or a 4.5 s cap), never comes before 1.6 s, and reports the real elapsed time.
 *
 * Smooth under load: every moving part (needle, shift lights, speed drums) is a Web Animation of `transform` or
 * `opacity`, so it runs on the compositor and keeps moving while the main thread compiles the hero.
 */

/** Never finish faster than this (first visit; repeat visits in the same session get the short run). */
const FLOOR_FIRST_S = 1.6;
const FLOOR_REPEAT_S = 0.9;
/** Never hold the page longer than this (seconds since navigation start). */
const CAP_FIRST_S = 3.6;
const CAP_REPEAT_S = 2.4;
const SEEN_KEY = "ng-launched";
const seenBefore = () => {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
};

// ── the dial ────────────────────────────────────────────────────────────────
const VB = 400;
const C = VB / 2;
const RPM_MAX = 9;
const REDLINE = 7.5;
/** 0 rpm sits at 135° (bottom-left), 9 at 405° (bottom-right): a 270° sweep, opening at the bottom. */
const angleOf = (rpm: number) => 135 + (Math.min(Math.max(rpm, 0), RPM_MAX) / RPM_MAX) * 270;
// rounded: Node and the browser can disagree in the last float digit, which React reports as a hydration mismatch
const round3 = (v: number) => Math.round(v * 1000) / 1000;
const polar = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [round3(C + r * Math.cos(a)), round3(C + r * Math.sin(a))] as const;
};
const arcPath = (r: number, from: number, to: number) => {
  const [x0, y0] = polar(r, angleOf(from));
  const [x1, y1] = polar(r, angleOf(to));
  const large = angleOf(to) - angleOf(from) > 180 ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};
const TICKS = Array.from({ length: RPM_MAX * 4 + 1 }, (_, i) => i / 4);
/** Shift lights: rpm at which each one comes on (two Rock Blue, one paper, two orange). */
const LIGHTS = [
  { at: 4.6, tone: "rock" },
  { at: 5.4, tone: "rock" },
  { at: 6.1, tone: "paper" },
  { at: 6.8, tone: "route" },
  { at: 7.35, tone: "route" },
] as const;
/** Faint contour rings printed on the face: the atlas, behind the instrument. */
const FACE_RINGS = [150, 122, 96, 72, 50].map((r, i) => {
  const pts = Array.from({ length: 49 }, (_, k) => {
    const t = (k / 48) * Math.PI * 2;
    const rr = r + Math.sin(t * 3 + i) * (3 + i) + Math.cos(t * 2 - i) * 2;
    return `${(C + 10 + rr * Math.cos(t)).toFixed(1)} ${(C + 26 + rr * 0.86 * Math.sin(t)).toFixed(1)}`;
  });
  return `M ${pts.join(" L ")} Z`;
});

// ── the run ─────────────────────────────────────────────────────────────────
/** Phase A: v(t) = CRUISE · (1 − e^(−t/τ)). Fast off the line, easing toward CRUISE, never quite stopping. */
const CRUISE = 91;
const TAU = 0.62;
const PHASE_A_S = 9;
/** Load progress 0..100 to rpm: idle at 0.85k, the limiter (7.75k, inside the orange band) exactly at 100. */
const IDLE = 0.85;
const LIMIT = 7.75;
const rpmOf = (v: number) => IDLE + (LIMIT - IDLE) * (v / 100);

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
const easeInOut = (x: number) => {
  const t = clamp01(x);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const phaseA = (t: number) => CRUISE * (1 - Math.exp(-t / TAU));
/** Revving while it waits: a small engine wobble that grows as the needle nears the redline. */
const wobble = (t: number, v: number) =>
  (0.07 * Math.sin(t * Math.PI * 2 * 2.4) + 0.03 * Math.sin(t * Math.PI * 2 * 5.1)) * smooth((v - 55) / 30);

/** Mechanical odometer drums for the km/h readout: ones roll, tens and hundreds click over late. */
const onesPos = (v: number) => v - 10 * Math.floor(v / 10 + 1e-9);
const tensPos = (v: number) => Math.floor(v / 10 + 1e-9) + smooth(onesPos(v) - 9);
const hundredsPos = (v: number) => smooth(v - 99);

type Strip = { el: HTMLElement; cells: number; pos: (v: number) => number; wraps: boolean };

const TEN = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "0"] as const;

function Drum({ id, cells }: { id: "h" | "t" | "o"; cells: readonly string[] }) {
  return (
    <span className="relative inline-block h-[0.86em] w-[1.2em] overflow-hidden text-center">
      <span data-drum={id} className="absolute inset-x-0 top-0 flex flex-col will-change-transform">
        {cells.map((c, i) => (
          <span key={i} className="block h-[0.86em] leading-[0.86em]">
            {c}
          </span>
        ))}
      </span>
    </span>
  );
}

export function Launch() {
  const isLaunched = useLaunched();
  const rootRef = useRef<HTMLDivElement>(null);
  const skipRef = useRef<() => void>(() => {});

  useGSAP(
    (_, contextSafe) => {
      const root = rootRef.current;
      if (!root || launched.get() || !contextSafe) return;

      const reduced = prefersReducedMotion();
      const html = document.documentElement;
      // everything behind the sheet is out of reach until launch (main, footer, the skip link)
      const behind = Array.from(document.querySelectorAll<HTMLElement>("#main, footer, a[href='#profile']")).filter(
        (el) => !root.contains(el),
      );
      behind.forEach((el) => el.setAttribute("inert", ""));
      const repeat = seenBefore();
      const FLOOR_S = repeat ? FLOOR_REPEAT_S : FLOOR_FIRST_S;
      const CAP_S = repeat ? CAP_REPEAT_S : CAP_FIRST_S;

      const q = <T extends Element>(sel: string) => root.querySelector<T>(sel);
      const dial = q<HTMLElement>("[data-dial]");
      const needle = q<HTMLElement>("[data-needle]");
      const gear = q<HTMLElement>("[data-gear]");
      const foot = q<HTMLElement>("[data-launch-foot]");
      const result = q<HTMLElement>("[data-launch-result]");
      const seconds = q<HTMLElement>("[data-launch-seconds]");
      if (!dial || !needle || !gear || !foot || !result || !seconds) return;
      const secondsEl: HTMLElement = seconds;

      const strips: Strip[] = (
        [
          [q<HTMLElement>("[data-drum='h']"), 2, hundredsPos, false],
          [q<HTMLElement>("[data-drum='t']"), 11, tensPos, false],
          [q<HTMLElement>("[data-drum='o']"), 11, onesPos, true],
        ] as const
      ).flatMap(([el, cells, pos, wraps]) => (el ? [{ el, cells, pos, wraps }] : []));
      const lights = Array.from(root.querySelectorAll<HTMLElement>("[data-light]")).map((el) => ({
        el,
        at: Number(el.dataset.light),
      }));

      // ── one phase = one set of Web Animations, all sampled from the same curve ──
      let running: Animation[] = [];
      let phase: "A" | "B" | "done" = "A";
      let phaseStart = 0;
      let aOffset = 0;
      let bFrom = 0;
      let bDur = 0;

      const valueNow = () => {
        const t = ((document.timeline.currentTime as number) - phaseStart) / 1000;
        if (phase === "A") return phaseA(aOffset + t);
        if (phase === "B") return bFrom + (100 - bFrom) * easeInOut(t / bDur);
        return 100;
      };

      /** valueAt(u) gives the load value; rpmAt(u, v) the needle's rpm (phase A adds the revving wobble). */
      const build = (valueAt: (u: number) => number, rpmAt: (u: number, v: number) => number, durationS: number) => {
        running.forEach((a) => a.cancel());
        running = [];
        const N = Math.max(24, Math.round(durationS * 40));
        const values = Array.from({ length: N + 1 }, (_, i) => valueAt(i / N));
        const rpms = values.map((v, i) => rpmAt(i / N, v));
        const opts: KeyframeAnimationOptions = { duration: durationS * 1000, fill: "forwards", easing: "linear" };

        running.push(
          needle.animate(
            rpms.map((r, i) => ({ transform: `rotate(${angleOf(r).toFixed(2)}deg)`, offset: i / N })),
            opts,
          ),
        );

        // shift lights follow the revs (they flicker when the revs hover on a threshold, like the real thing)
        for (const l of lights) {
          running.push(l.el.animate(rpms.map((r, i) => ({ opacity: r >= l.at ? 1 : 0.16, offset: i / N })), opts));
        }

        for (const st of strips) {
          const frames: Keyframe[] = [];
          const tf = (p: number) => `translate3d(0, ${(-p * 100) / st.cells}%, 0)`;
          for (let i = 0; i <= N; i++) {
            const p = st.pos(values[i]);
            if (st.wraps && i > 0 && p < st.pos(values[i - 1]) - 0.5) {
              // the ones drum wraps 9→0 at the exact moment the value passes a multiple of ten
              const crossV = Math.ceil(values[i - 1] / 10 + 1e-9) * 10;
              const k = (crossV - values[i - 1]) / Math.max(1e-6, values[i] - values[i - 1]);
              const uc = (i - 1 + k) / N;
              frames.push({ transform: tf(10), offset: uc }, { transform: tf(0), offset: uc });
            }
            frames.push({ transform: tf(p), offset: i / N });
          }
          running.push(st.el.animate(frames, opts));
        }

        phaseStart = document.timeline.currentTime as number;
        return running[0];
      };

      const startA = (fromS: number) => {
        phase = "A";
        aOffset = fromS;
        build(
          (u) => phaseA(fromS + u * PHASE_A_S),
          (u, v) => rpmOf(v) + wobble(fromS + u * PHASE_A_S, v),
          PHASE_A_S,
        );
      };

      const finalize = () => {
        html.removeAttribute("data-loading");
        behind.forEach((el) => el.removeAttribute("inert"));
        if (window.scrollY > 0 && !location.hash) window.scrollTo(0, 0);
        try {
          sessionStorage.setItem(SEEN_KEY, "1");
        } catch {
          /* storage blocked: every visit gets the full run */
        }
        launchExit.set(true);
        launched.set(true);
      };

      // ── the launch: limiter bounce, lights flash, N → 1, then the site opens through the dial's hub ──
      const exit = contextSafe((skipped: boolean) => {
        const r = dial.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        const far = Math.hypot(Math.max(cx, window.innerWidth - cx), Math.max(cy, window.innerHeight - cy)) + 40;
        const iris = { r: 0 };
        const paint = () => {
          const m = `radial-gradient(circle at ${cx.toFixed(1)}px ${cy.toFixed(1)}px, transparent ${iris.r.toFixed(1)}px, #000 ${(iris.r + 1.5).toFixed(1)}px)`;
          root.style.maskImage = m;
          root.style.webkitMaskImage = m;
        };

        const tl = gsap.timeline({ onComplete: finalize });
        if (!skipped && !reduced) {
          const top = angleOf(LIMIT);
          running.push(
            needle.animate(
              [0, 3.6, -2.6, 2.4, -1.6, 1, 0].map((d, i, a) => ({
                transform: `rotate(${(top + d).toFixed(2)}deg)`,
                offset: i / (a.length - 1),
              })),
              { duration: 520, easing: "ease-out", fill: "forwards" },
            ),
          );
          for (const l of lights) {
            running.push(
              l.el.animate([{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }], {
                duration: 520,
                fill: "forwards",
              }),
            );
          }
          tl.call(
            () => {
              gear.textContent = "1";
              gear.dataset.engaged = "true";
            },
            undefined,
            0.36,
          );
          tl.fromTo(
            result,
            { autoAlpha: 1, clipPath: "inset(0% 100% 0% 0%)" },
            { clipPath: "inset(0% 0% 0% 0%)", duration: 0.35, ease: "road" },
            0.1,
          );
          tl.to({}, { duration: 0.3 });
        } else if (!skipped) {
          tl.to(result, { autoAlpha: 1, duration: 0.2, ease: "power1.out" });
          tl.to({}, { duration: 0.3 });
        }
        tl.call(() => launchExit.set(true));
        if (reduced) {
          tl.to(root, { autoAlpha: 0, duration: 0.3, ease: "power1.out" });
        } else {
          // through the centre of the dial: the sheet opens from the hub outward while the dial rushes past you
          tl.addLabel("open")
            .to(iris, { r: far, duration: skipped ? 0.75 : 0.95, ease: "steer", onUpdate: paint }, "open")
            .to(dial, { scale: 1.35, autoAlpha: 0, duration: skipped ? 0.6 : 0.8, ease: "steer" }, "open")
            .to(foot, { autoAlpha: 0, y: 12, duration: 0.3, ease: "road" }, "open");
        }
      });

      const startB = () => {
        if (phase !== "A") return;
        const from = Math.min(99.5, valueNow());
        phase = "B";
        bFrom = from;
        bDur = reduced ? 0.01 : 0.42 + 0.5 * ((100 - from) / 100);
        const anim = build((u) => from + (100 - from) * easeInOut(u), (_u, v) => rpmOf(v), bDur);
        anim.finished
          .then(() => {
            if (phase !== "B") return;
            phase = "done";
            launchTime.seconds = Math.round(performance.now() / 10) / 100;
            secondsEl.textContent = launchTime.seconds.toFixed(2);
            exit(false);
          })
          .catch(() => {});
      };

      // ── readiness: decides only WHEN the finish starts; the motion never waits on it ──
      let fonts = !document.fonts;
      let loaded = document.readyState === "complete";
      let hero = heroReady.get();
      document.fonts?.ready.then(() => (fonts = true)).catch(() => (fonts = true));
      const onLoad = () => (loaded = true);
      if (!loaded) window.addEventListener("load", onLoad, { once: true });
      const offHero = heroReady.subscribe(() => (hero = heroReady.get()));

      const mountAt = performance.now() / 1000;
      const check = () => {
        if (phase !== "A") return;
        const now = performance.now() / 1000;
        const ready = fonts && loaded && hero;
        if ((ready && now - mountAt >= FLOOR_S) || now >= Math.max(CAP_S, mountAt + FLOOR_S)) startB();
      };
      gsap.ticker.add(check);

      skipRef.current = () => {
        if (phase === "done") return;
        phase = "done";
        running.forEach((a) => a.pause());
        launchTime.seconds = 0;
        exit(true);
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.key === "Escape") skipRef.current();
      };
      window.addEventListener("keydown", onKey);

      if (reduced) {
        // no travel: the dial holds still and simply finishes when the page is ready
        phase = "A";
        phaseStart = document.timeline.currentTime as number;
        aOffset = 60;
      } else {
        startA(0);
      }

      return () => {
        gsap.ticker.remove(check);
        running.forEach((a) => a.cancel());
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("load", onLoad);
        offHero();
        behind.forEach((el) => el.removeAttribute("inert"));
      };
    },
    { scope: rootRef },
  );

  if (isLaunched) return null;

  return (
    <div
      id="launch"
      ref={rootRef}
      className="fixed inset-0 z-[80] flex flex-col overflow-hidden bg-paper text-ink"
      style={{ clipPath: "inset(0% 0% 0% 0%)" }}
    >
      <p className="sr-only" role="status">
        Loading
      </p>

      <div className="mx-auto flex h-16 w-full max-w-[var(--container-route)] shrink-0 items-center justify-between px-[var(--gutter)]">
        {/* same roundel, same spot as the route nav underneath: the sheet lifts off its own header */}
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full border-[1.5px] border-venice font-display text-[0.6rem] leading-none font-bold tracking-[-0.02em] text-venice"
        >
          NG
        </span>
        <button
          type="button"
          onClick={() => skipRef.current()}
          className="-mr-2 inline-flex h-11 items-center gap-2.5 rounded-full px-2 text-[0.875rem] font-medium text-ink/75 transition-[color,transform] duration-150 ease-[var(--ease-out)] hover:text-ink active:scale-[0.97]"
        >
          Skip intro
          <kbd className="[@media(hover:none)]:hidden rounded-[4px] border border-ink/20 px-1.5 py-0.5 font-sans text-[0.6875rem] leading-none font-medium text-ink/60">
            Esc
          </kbd>
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[var(--gutter)] pb-[clamp(1rem,6vh,3.5rem)]">
        {/* the instrument */}
        <div data-dial aria-hidden="true" className="@container relative aspect-square w-[min(86vw,60svh,560px)] will-change-transform">
          <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 size-full" focusable="false">
            {/* bezel and face */}
            <circle cx={C} cy={C} r={197} className="fill-venice" />
            <circle cx={C} cy={C} r={189} className="fill-night" />
            <circle cx={C} cy={C} r={189} fill="none" className="stroke-paper" strokeOpacity={0.14} strokeWidth={1} />
            {FACE_RINGS.map((d) => (
              <path key={d} d={d} fill="none" className="stroke-rock" strokeOpacity={0.12} strokeWidth={1} />
            ))}

            {/* the redline band */}
            <path d={arcPath(171, REDLINE, RPM_MAX)} fill="none" className="stroke-route" strokeWidth={11} />

            {/* the scale: quarter, half and whole thousands */}
            {TICKS.map((t) => {
              const major = t % 1 === 0;
              const half = !major && t % 0.5 === 0;
              const deg = angleOf(t);
              const [x0, y0] = polar(176, deg);
              const [x1, y1] = polar(major ? 150 : half ? 160 : 165, deg);
              const red = t >= REDLINE;
              return (
                <line
                  key={t}
                  x1={x0}
                  y1={y0}
                  x2={x1}
                  y2={y1}
                  className={red ? "stroke-night" : major ? "stroke-paper" : "stroke-rock-soft"}
                  strokeOpacity={major || red ? 1 : 0.55}
                  strokeWidth={major ? 3.2 : 1.4}
                />
              );
            })}
            {Array.from({ length: RPM_MAX + 1 }, (_, n) => {
              const [x, y] = polar(124, angleOf(n));
              return (
                <text
                  key={n}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  className={`font-display ${n >= 8 ? "fill-route" : "fill-paper"}`}
                  style={{ fontSize: 25, fontWeight: 650, letterSpacing: "-0.02em" }}
                >
                  {n}
                </text>
              );
            })}
            <text x={C} y={150} textAnchor="middle" className="fill-rock-soft font-sans" style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.06em" }}>
              ×1000 r/min
            </text>
          </svg>

          {/* shift lights: their own layers, so their flashes stay on the compositor */}
          <div className="absolute top-[27.5%] left-1/2 flex -translate-x-1/2 gap-[2.2cqw]">
            {LIGHTS.map((l) => (
              <span
                key={l.at}
                data-light={l.at}
                className={`block size-[3.2cqw] rounded-full opacity-[0.16] ${l.tone === "route" ? "bg-route" : l.tone === "paper" ? "bg-paper" : "bg-rock"}`}
              />
            ))}
          </div>

          {/* gear indicator, just under the hub (the needle sweeps over it, as on the real thing) */}
          <span
            data-gear
            className="absolute top-[59%] left-1/2 grid h-[8.4cqw] w-[7cqw] -translate-x-1/2 place-items-center rounded-[1.1cqw] border border-paper/30 font-display text-[5cqw] leading-none font-bold text-paper data-[engaged=true]:border-route data-[engaged=true]:text-route"
          >
            N
          </span>

          {/* road speed, in the opening at the bottom of the scale, clear of the 0 and 9 */}
          <div className="absolute top-[71.5%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-[1.2cqw] text-paper">
            <span className="flex font-display text-[7.6cqw] leading-[0.86] font-bold tabular-nums">
              <Drum id="h" cells={["0", "1"]} />
              <Drum id="t" cells={TEN} />
              <Drum id="o" cells={TEN} />
            </span>
            <span className="font-mono text-[2.7cqw] leading-none tracking-[0.08em] text-rock-soft">km/h</span>
          </div>

          {/* the needle: its own layer, rotated on the compositor */}
          <div data-needle className="absolute inset-0 will-change-transform" style={{ transform: `rotate(${angleOf(0)}deg)` }}>
            <svg viewBox={`0 0 ${VB} ${VB}`} className="absolute inset-0 size-full" focusable="false">
              <path d={`M ${C - 26} ${C - 3.4} L ${C + 166} ${C - 1.1} L ${C + 166} ${C + 1.1} L ${C - 26} ${C + 3.4} Z`} className="fill-route" />
              <circle cx={C} cy={C} r={15} className="fill-ink" />
              <circle cx={C} cy={C} r={15} fill="none" className="stroke-paper" strokeOpacity={0.6} strokeWidth={1.5} />
              <circle cx={C} cy={C} r={3.2} className="fill-route" />
            </svg>
          </div>
        </div>

        <div data-launch-foot className="mt-[clamp(1rem,3vh,1.75rem)] h-5">
          <p data-launch-result className="invisible font-mono text-[clamp(0.8125rem,1.2vw,1rem)] tracking-[0.04em] text-venice">
            0–100 in <span data-launch-seconds className="text-ink tabular-nums">0.00</span> s
          </p>
        </div>
      </div>
    </div>
  );
}
