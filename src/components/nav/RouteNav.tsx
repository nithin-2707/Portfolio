"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useLenis } from "lenis/react";
import { useMotionValue } from "motion/react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { person, waypoints } from "@/content/site";
import { launched, ROUTE_KM, scrollState, useLaunched } from "@/lib/stores";
import { prefersReducedMotion } from "@/lib/useReducedMotion";
import { MapSheet, type MapStop } from "./MapSheet";
import { Odometer } from "./Odometer";
import WarmTooltip, { WarmTooltipGroup } from "./WarmTooltip";

/**
 * The paint under the bar for each waypoint. Gearbox and Finish are printed on paper; Stages is the one Venice
 * sheet; Side roads, Licences and the footer are night.
 */
type Tone = "paper" | "venice" | "night" | "route";
const TONE: Record<string, Tone> = {
  start: "paper",
  profile: "paper",
  stages: "venice",
  "service-park": "paper",
  builds: "paper",
  "side-roads": "night",
  gearbox: "paper",
  licences: "night",
  finish: "route",
};

const LAST = waypoints.length - 1;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const kmLabel = (km: number) => km.toFixed(1).padStart(4, "0");

/** A pinned section reads as top: 0 while pinned; its pin-spacer keeps the real place in the page. */
function placeOf(id: string): HTMLElement | null {
  const el = document.getElementById(id);
  const parent = el?.parentElement;
  return parent?.classList.contains("pin-spacer") ? parent : el;
}

/**
 * The route nav: a race-number roundel, the page drawn as a route line with one waypoint per
 * section (desktop), and a mechanical odometer of the distance scrolled. On phones the route
 * folds into a Map sheet. Colours follow the paint of the section under the bar.
 */
export function RouteNav() {
  const headerRef = useRef<HTMLElement>(null);
  const progressRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLSpanElement>(null);
  const mapButtonRef = useRef<HTMLButtonElement>(null);
  /** scroll offset at which each waypoint becomes the active one */
  const startsRef = useRef<number[]>([]);
  /** where each paint (tone) zone starts, in scroll px, with its tone; read per frame like the waypoints */
  const tonesRef = useRef<{ start: number; tone: Tone }[]>([]);
  const armedRef = useRef(false);

  const [active, setActive] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [stops, setStops] = useState<MapStop[]>(() => waypoints.map((w) => ({ id: w.id, label: w.label, km: kmLabel(0) })));

  const km = useMotionValue(0);
  const lenis = useLenis();
  const isLaunched = useLaunched();

  const go = useCallback(
    (id: string) => {
      const target = id === "start" ? null : placeOf(id);
      if (!lenis) {
        if (target) target.scrollIntoView();
        else window.scrollTo(0, 0);
        return;
      }
      lenis.scrollTo(target ?? 0, {
        duration: 1.4,
        easing: easeOutQuart,
        force: true,
        // keyboard users continue from the section they drove to, not from the nav
        onComplete: () => {
          const el = document.getElementById(id);
          if (!el) return;
          if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
          el.focus({ preventScroll: true });
        },
      });
    },
    [lenis],
  );

  const onAnchor = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (!lenis) return; // plain anchor jump without JS smoothing
    e.preventDefault();
    go(id);
  };

  // active waypoint, bar tone and the scroll scale of the route line
  useGSAP(
    () => {
      const header = headerRef.current;
      if (!header) return;
      const sections = waypoints.map((w) => document.getElementById(w.id));

      const activeTriggers = sections.map((el) =>
        el ? ScrollTrigger.create({ trigger: el, start: "top 40%", refreshPriority: -10 }) : null,
      );

      const toneTargets: [Element | null, Tone][] = sections.map((el, i) => [el, TONE[waypoints[i].id] ?? "paper"]);
      toneTargets.push([document.querySelector("footer"), "night"]);
      const toneTriggers = toneTargets.flatMap(([el, tone]) =>
        el ? [{ tone, st: ScrollTrigger.create({ trigger: el, start: "top 32px", refreshPriority: -10 }) }] : [],
      );

      // monotonic, so a missing section simply shares its neighbour's start
      const record = () => {
        const starts: number[] = [];
        let prev = 0;
        for (const t of activeTriggers) {
          if (t) prev = Math.max(prev, t.start, 0);
          starts.push(prev);
        }
        startsRef.current = starts;
        tonesRef.current = toneTriggers.map(({ tone, st }) => ({ start: st.start, tone }));
      };
      record();
      ScrollTrigger.addEventListener("refresh", record);
      return () => ScrollTrigger.removeEventListener("refresh", record);
    },
    { scope: headerRef },
  );

  // per frame, outside React: odometer, progress along the route, hairline
  useEffect(() => {
    const header = headerRef.current;
    const progress = progressRef.current;
    const marker = markerRef.current;
    if (!header || !progress || !marker) return;
    let lastF = -1;
    let lastScrolled: boolean | null = null;
    let lastY = Number.NaN;
    let lastStarts: number[] | null = null;
    let lastActive = -1;

    const update = () => {
      // Lenis writes the scroll position into the store each frame; nothing to do while the page is still
      const y = scrollState.y;
      if (y === lastY && startsRef.current === lastStarts) return;
      lastY = y;
      lastStarts = startsRef.current;
      km.set(scrollState.km);

      const scrolled = y > 40;
      if (scrolled !== lastScrolled) {
        lastScrolled = scrolled;
        header.dataset.scrolled = scrolled ? "true" : "false";
      }

      // the active waypoint is the last one whose section has reached the 40% line; the paint, the last zone under the bar
      const s = startsRef.current;
      let idx = 0;
      for (let i = 0; i < s.length; i += 1) if (y >= s[i] - 0.5) idx = i;
      if (idx !== lastActive) {
        lastActive = idx;
        setActive(idx);
      }
      let tone: Tone = "paper";
      for (const z of tonesRef.current) if (y >= z.start - 0.5) tone = z.tone;
      if (header.dataset.tone !== tone) header.dataset.tone = tone;

      // piecewise: the tip reaches waypoint i exactly when section i becomes active
      let f = 0;
      if (s.length > 1) {
        if (y >= s[s.length - 1]) f = 1;
        else {
          let i = 0;
          while (i < s.length - 2 && y >= s[i + 1]) i++;
          const span = s[i + 1] - s[i];
          f = (i + (span > 0 ? Math.min(1, Math.max(0, (y - s[i]) / span)) : 0)) / (s.length - 1);
        }
      }
      if (Math.abs(f - lastF) > 1e-5) {
        lastF = f;
        progress.style.transform = `scaleX(${f.toFixed(5)})`;
        marker.style.transform = `translateX(${(f * 100).toFixed(3)}%)`;
      }
    };
    gsap.ticker.add(update);
    return () => gsap.ticker.remove(update);
  }, [km]);

  // under the launch sheet: keep keyboard focus out, and fold the route away for its entrance
  useGSAP(
    () => {
      const header = headerRef.current;
      if (!header || launched.get()) return;
      header.inert = true;
      if (prefersReducedMotion()) return;
      gsap.set(header.querySelector("[data-route-line]"), { scaleX: 0, transformOrigin: "0% 50%" });
      gsap.set(header.querySelectorAll("[data-dot], [data-route-marker]"), { scale: 0.4, autoAlpha: 0 });
      armedRef.current = true;
    },
    { scope: headerRef },
  );

  // after launch: the route line draws itself in, then the waypoints pop on in order
  useGSAP(
    () => {
      const header = headerRef.current;
      if (!isLaunched || !header) return;
      header.inert = false;
      if (!armedRef.current) return;
      armedRef.current = false;
      gsap.to(header.querySelector("[data-route-line]"), { scaleX: 1, duration: 0.8, ease: "road" });
      gsap.to(header.querySelectorAll("[data-dot], [data-route-marker]"), {
        scale: 1,
        autoAlpha: 1,
        duration: 0.45,
        ease: "road",
        stagger: 0.04,
        delay: 0.12,
      });
    },
    { scope: headerRef, dependencies: [isLaunched] },
  );

  const openMap = () => {
    const max = ScrollTrigger.maxScroll(window) || 1;
    const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    setStops(
      waypoints.map((w) => {
        const el = placeOf(w.id);
        // where a click on this stop would land, as a share of the whole route
        const top = el && w.id !== "start" ? el.getBoundingClientRect().top + window.scrollY - pad : 0;
        return { id: w.id, label: w.label, km: kmLabel(Math.min(1, Math.max(0, top / max)) * ROUTE_KM) };
      }),
    );
    setMapOpen(true);
    lenis?.stop();
  };

  const closeMap = useCallback(
    (target?: string) => {
      setMapOpen(false);
      lenis?.start();
      if (target) go(target);
    },
    [lenis, go],
  );

  return (
    <>
      <header
        ref={headerRef}
        data-tone="paper"
        data-scrolled="false"
        className="group/nav fixed inset-x-0 top-0 z-50 text-[color:var(--nav-fg)] transition-colors duration-300 ease-[var(--ease-out)] [--nav-accent:var(--color-route)] [--nav-bg:var(--color-paper)] [--nav-fg:var(--color-ink)] [--nav-hair:color-mix(in_srgb,var(--nav-fg)_16%,transparent)] [--nav-line:var(--color-venice)] data-[tone=night]:[--nav-bg:var(--color-night)] data-[tone=night]:[--nav-fg:var(--color-paper)] data-[tone=night]:[--nav-line:var(--color-rock-soft)] data-[tone=venice]:[--nav-bg:var(--color-venice)] data-[tone=venice]:[--nav-fg:var(--color-paper)] data-[tone=venice]:[--nav-line:var(--color-paper)] data-[tone=route]:[--nav-bg:var(--color-route)] data-[tone=route]:[--nav-fg:var(--color-night)] data-[tone=route]:[--nav-line:var(--color-night)] data-[tone=route]:[--nav-accent:var(--color-night)]"
      >
        {/* the bar takes the paint of the section beneath it once the page moves */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[color:var(--nav-bg)] opacity-0 transition-[opacity,background-color] duration-300 ease-[var(--ease-out)] group-data-[scrolled=true]/nav:opacity-100"
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 bg-[color:var(--nav-hair)] transition-transform duration-500 ease-[var(--ease-out)] group-data-[scrolled=true]/nav:scale-x-100 motion-reduce:transition-none"
        />

        <nav
          aria-label="Route"
          className="relative mx-auto grid h-16 max-w-[var(--container-route)] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-6 px-[var(--gutter)]"
        >
          <a
            href="#start"
            onClick={onAnchor("start")}
            aria-label={`NG, ${person.name}, back to the start`}
            className="grid size-9 place-items-center rounded-full! border-[1.5px] border-[color:var(--nav-line)] font-display text-[0.6rem] leading-none font-bold tracking-[-0.02em] text-[color:var(--nav-line)] transition-[transform,color,border-color] duration-200 ease-[var(--ease-out)] active:scale-[0.94]"
          >
            NG
          </a>

          {/* desktop: the whole page as one route */}
          <div className="hidden justify-center lg:flex">
            <div className="relative w-full max-w-[34rem]">
              <span
                aria-hidden="true"
                data-route-line
                className="absolute inset-x-4 top-1/2 h-px -translate-y-1/2 bg-[color:var(--nav-line)] opacity-55"
              />
              <span aria-hidden="true" className="absolute inset-x-4 top-1/2 h-[2px] -translate-y-1/2">
                <span
                  ref={progressRef}
                  className="absolute inset-0 origin-left scale-x-0 bg-[color:var(--nav-accent)] transition-colors duration-300"
                />
              </span>

              <WarmTooltipGroup delay={320} warmWindow={360}>
                <ol className="relative flex items-center justify-between">
                  {waypoints.map((w, i) => {
                    const state = i === active ? "active" : i < active ? "passed" : "ahead";
                    return (
                      <li key={w.id} className="relative">
                        <WarmTooltip content={w.label} side="bottom" gap={4} arrow={false} popBlur={2} disabled={i === active}>
                          <a
                            href={`#${w.id}`}
                            onClick={onAnchor(w.id)}
                            data-dot
                            data-state={state}
                            aria-current={i === active ? "location" : undefined}
                            className="group/dot grid size-8 place-items-center rounded-full"
                          >
                            <span
                              aria-hidden="true"
                              className="size-2 rounded-full border border-[color:var(--nav-fg)] bg-[color:var(--nav-bg)] transition-[transform,background-color,border-color] duration-200 ease-[var(--ease-out)] group-hover/dot:scale-[1.35] group-data-[state=active]/dot:scale-[1.3] group-data-[state=active]/dot:border-[color:var(--nav-accent)] group-data-[state=active]/dot:bg-[color:var(--nav-accent)] group-data-[state=passed]/dot:bg-[color:var(--nav-fg)]"
                            />
                            <span className="sr-only">{w.label}</span>
                          </a>
                        </WarmTooltip>
                      </li>
                    );
                  })}
                </ol>
              </WarmTooltipGroup>

              {/* the travelling marker rides the tip of the orange progress */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-1/2 h-0">
                <span ref={markerRef} className="absolute inset-x-0 top-0 block">
                  <span data-route-marker className="absolute top-0 left-0 block -translate-x-1/2 -translate-y-1/2">
                    <svg viewBox="0 0 10 10" className="block size-2.5 text-[color:var(--nav-fg)]">
                      <path d="M1.5 1 9 5l-7.5 4L3.6 5Z" fill="currentColor" />
                    </svg>
                  </span>
                </span>
              </span>

              {/* the active waypoint's name, carried along under the line */}
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-full h-0">
                <span
                  className="absolute inset-x-0 top-0 block transition-transform duration-500 ease-[var(--ease-in-out)] motion-reduce:transition-none"
                  style={{ transform: `translateX(${((active / LAST) * 100).toFixed(3)}%)` }}
                >
                  <span key={active} className="absolute top-[-3px] left-0 -translate-x-1/2 text-[0.75rem] leading-none font-medium whitespace-nowrap">
                    {waypoints[active].label}
                  </span>
                </span>
              </span>
            </div>
          </div>

          <div className="col-start-3 flex items-center gap-4 sm:gap-5">
            <span className="flex items-center gap-1.5 font-mono text-[0.75rem] tracking-[0.06em]">
              <span aria-hidden="true" className="opacity-70">
                KM
              </span>
              <Odometer value={km} height={18} />
            </span>

            <button
              ref={mapButtonRef}
              type="button"
              onClick={openMap}
              aria-haspopup="dialog"
              aria-expanded={mapOpen}
              aria-controls="route-map"
              className="-mr-2 inline-flex h-11 items-center gap-2 rounded-full! border border-[color:var(--nav-hair)] px-3.5 text-[0.875rem] font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] lg:hidden"
            >
              <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="size-4">
                <path
                  d="M1.75 3.5 5.5 2l5 1.5L14.25 2v10.5L10.5 14l-5-1.5-3.75 1.5ZM5.5 2v10.5M10.5 3.5V14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinejoin="round"
                />
              </svg>
              Map
            </button>
          </div>
        </nav>
      </header>

      <MapSheet open={mapOpen} stops={stops} active={active} triggerRef={mapButtonRef} onClose={closeMap} />
    </>
  );
}
