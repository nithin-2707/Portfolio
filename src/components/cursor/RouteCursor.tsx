"use client";

import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { readColors, rgba } from "@/lib/palette";

/**
 * The pointer is a car.
 *
 * - A top-down car (route-orange livery stripe, tail lights) IS the pointer: its nose sits exactly on the real
 *   pointer position and follows it 1:1, so clicking stays precise. It steers to face the way you move (the heading
 *   eases; the position never lags) and holds its heading when you stop.
 * - It draws the road it drives: a short route-orange trail from the rear axle that fades over ~0.6 s.
 * - Over anything you can press, corner brackets snap around the target like a parking bay and
 *   the car's tail lights come on. [data-cursor-label] adds a one-word hint ("Drag", "Hold").
 * - Press = a quick brake (the car dips, a ring ripples from the nose).
 *
 * Only on fine pointers with hover, and never under reduced motion: there the native cursor stays.
 */

const INTERACTIVE = "a, button, [role='button'], [role='radio'], [role='tab'], summary, label, select, [data-cursor]";
const DARK_SECTIONS = "#stages, #side-roads, #licences, footer, .svp-bay.is-open";
const ORANGE_SECTIONS = "#finish";
/** the car's nose in its own SVG (36 x 20, nose to the right): this point is the hotspot */
const NOSE_X = 34;
const NOSE_Y = 10;
/** nose to rear axle, along the heading: where the trail is laid */
const REAR = 24;

export function RouteCursor() {
  const fine = useMediaQuery("(hover: hover) and (pointer: fine)");
  const reduced = useMediaQuery("(prefers-reduced-motion: reduce)");
  const enabled = fine && !reduced;

  const rootRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<SVGGElement>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const labelPosRef = useRef<HTMLDivElement>(null);
  const rippleRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    const car = carRef.current;
    const body = bodyRef.current;
    const bracket = bracketRef.current;
    const label = labelRef.current;
    const labelPos = labelPosRef.current;
    const ripple = rippleRef.current;
    const canvas = canvasRef.current;
    if (!root || !car || !body || !bracket || !label || !labelPos || !ripple || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    document.documentElement.classList.add("route-cursor-on");

    // ── state (never React state: this runs every frame) ──
    const pointer = { x: -100, y: -100, seen: false };
    const last = { x: -100, y: -100 };
    /** smoothed pointer velocity (px/s): the car faces where this points */
    const vel = { x: 0, y: 0 };
    let heading = 0; // radians, 0 = facing right
    let visible = false;
    let hovering: Element | null = null;
    let lastToneCheck = 0;
    const trail: { x: number; y: number; t: number }[] = [];
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const sizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };
    sizeCanvas();

    const show = (on: boolean) => {
      if (on === visible) return;
      visible = on;
      gsap.to(car, { autoAlpha: on ? 1 : 0, duration: on ? 0.25 : 0.15, ease: "road", overwrite: "auto" });
      if (!on) gsap.to([bracket, label], { autoAlpha: 0, duration: 0.15, overwrite: "auto" });
    };

    // ── brackets: snap around the hovered target like a parking bay ──
    const frameTarget = (el: Element | null) => {
      hovering = el;
      if (!el) {
        car.dataset.lit = "false";
        gsap.to(bracket, { autoAlpha: 0, scale: 0.85, duration: 0.18, ease: "road", overwrite: "auto" });
        gsap.to(label, { autoAlpha: 0, x: 0, duration: 0.15, overwrite: "auto" });
        return;
      }
      car.dataset.lit = "true";
      const r = el.getBoundingClientRect();
      const pad = 6;
      const hint = (el.closest("[data-cursor-label]") as HTMLElement | null)?.dataset.cursorLabel;
      const showHint = () => {
        if (hint) {
          label.textContent = hint;
          gsap.to(label, { autoAlpha: 1, x: 6, duration: 0.2, ease: "road", overwrite: "auto" });
        } else {
          gsap.to(label, { autoAlpha: 0, x: 0, duration: 0.15, overwrite: "auto" });
        }
      };
      // a whole surface (a draggable gallery): no bay to park in, just the hint and the lit tail lights
      if (r.width * r.height > window.innerWidth * window.innerHeight * 0.25) {
        gsap.to(bracket, { autoAlpha: 0, scale: 0.85, duration: 0.18, ease: "road", overwrite: "auto" });
        showHint();
        return;
      }
      gsap.to(bracket, {
        x: r.left - pad,
        y: r.top - pad,
        width: r.width + pad * 2,
        height: r.height + pad * 2,
        autoAlpha: 1,
        scale: 1,
        duration: 0.32,
        ease: "road",
        overwrite: "auto",
      });
      showHint();
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.seen) {
        pointer.seen = true;
        last.x = pointer.x;
        last.y = pointer.y;
      }
      show(true);
      const target = (e.target as Element | null)?.closest?.(INTERACTIVE) ?? null;
      if (target !== hovering) frameTarget(target);
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      gsap.fromTo(ripple, { x: pointer.x, y: pointer.y, scale: 0.4, autoAlpha: 0.9 }, { scale: 2.6, autoAlpha: 0, duration: 0.5, ease: "road", overwrite: true });
      gsap.fromTo(body, { scale: 1 }, { scale: 0.86, duration: 0.09, yoyo: true, repeat: 1, ease: "power2.out", transformOrigin: "50% 50%", overwrite: true });
    };

    const onLeave = () => show(false);
    const onScroll = () => {
      // keep the brackets glued to the target while the page moves under a still pointer
      if (hovering) frameTarget(hovering.isConnected ? hovering : null);
    };

    // ── per-frame drive ──
    let painted = false; // whether the trail canvas holds anything that needs clearing
    const colors = readColors();
    const tick = (_t: number, deltaMs: number) => {
      if (!pointer.seen) return; // no mouse yet: nothing to draw
      const dt = Math.min(deltaMs, 50) / 1000;
      const now = performance.now();

      labelPos.style.transform = `translate3d(${pointer.x + 14}px, ${pointer.y + 14}px, 0)`;

      // velocity from the pointer itself, eased a little so a single jittery event cannot spin the car
      const ix = (pointer.x - last.x) / Math.max(dt, 1e-3);
      const iy = (pointer.y - last.y) / Math.max(dt, 1e-3);
      last.x = pointer.x;
      last.y = pointer.y;
      const kv = 1 - Math.exp(-dt * 18);
      vel.x += (ix - vel.x) * kv;
      vel.y += (iy - vel.y) * kv;
      const speed = Math.hypot(vel.x, vel.y);
      // steer toward the direction of travel; below walking pace the car holds its heading
      if (speed > 60) {
        let diff = Math.atan2(vel.y, vel.x) - heading;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        heading += diff * (1 - Math.exp(-dt * 12));
      }
      // a hint of body roll at speed: the car stretches very slightly along its heading
      const stretch = 1 + Math.min(speed / 4000, 0.06);
      // the element's origin is the nose, so the nose stays exactly on the pointer whatever the heading
      car.style.transform = `translate3d(${pointer.x}px, ${pointer.y}px, 0) rotate(${heading}rad) scale(${stretch}, ${2 - stretch})`;

      // tone: paper car on night/venice stages, ink car on paper (checked ~8x/s)
      if (now - lastToneCheck > 120) {
        lastToneCheck = now;
        const under = document.elementFromPoint(pointer.x, pointer.y);
        const tone = under?.closest(DARK_SECTIONS) ? "dark" : under?.closest(ORANGE_SECTIONS) ? "route" : "light";
        if (tone !== root.dataset.tone) root.dataset.tone = tone;
      }

      // the road it drives: rear-axle points, faded by age
      if (visible && speed > 30) trail.push({ x: pointer.x - Math.cos(heading) * REAR, y: pointer.y - Math.sin(heading) * REAR, t: now });
      while (trail.length && now - trail[0].t > 620) trail.shift();
      // a parked car leaves an empty canvas: skip the full-screen clear until there is a trail again
      if (!painted && trail.length < 2) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      painted = trail.length > 1;
      if (trail.length > 1) {
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        for (let i = 1; i < trail.length; i++) {
          const a = trail[i - 1];
          const b = trail[i];
          const life = 1 - (now - b.t) / 620;
          // the trail is the route: orange, except on the orange finish where it is drawn in night ink
          ctx.strokeStyle = root.dataset.tone === "route" ? rgba(colors.night, 0.5 * life * life) : rgba(colors.route, 0.55 * life * life);
          ctx.lineWidth = 1 + 2 * life;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    };

    gsap.set([car, bracket, label], { autoAlpha: 0 });
    gsap.set(ripple, { autoAlpha: 0, xPercent: -50, yPercent: -50 });
    gsap.ticker.add(tick);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    window.addEventListener("blur", onLeave);
    window.addEventListener("resize", sizeCanvas);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", sizeCanvas);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.classList.remove("route-cursor-on");
      gsap.killTweensOf([car, body, bracket, label, ripple]);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div ref={rootRef} data-tone="light" aria-hidden="true" className="route-cursor pointer-events-none fixed inset-0 z-[95]">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* parking-bay brackets around the hovered target */}
      <div ref={bracketRef} className="rc-bracket absolute top-0 left-0 origin-center">
        <span className="rc-corner left-0 top-0 border-t border-l" />
        <span className="rc-corner right-0 top-0 border-t border-r" />
        <span className="rc-corner bottom-0 left-0 border-b border-l" />
        <span className="rc-corner right-0 bottom-0 border-r border-b" />
      </div>

      {/* press ripple */}
      <div ref={rippleRef} className="absolute top-0 left-0 size-6 rounded-full border border-route" />

      {/* the car is the pointer: a zero-size element whose origin is the nose, rotated by the ticker */}
      <div ref={carRef} data-lit="false" className="rc-car absolute top-0 left-0 size-0 origin-top-left will-change-transform">
        <svg width="36" height="20" viewBox="0 0 36 20" overflow="visible" className="absolute" style={{ left: -NOSE_X, top: -NOSE_Y }}>
          <g ref={bodyRef}>
            {/* tyres */}
            <rect className="rc-tyre" x="7" y="0" width="6" height="3" rx="1" />
            <rect className="rc-tyre" x="23" y="0" width="6" height="3" rx="1" />
            <rect className="rc-tyre" x="7" y="17" width="6" height="3" rx="1" />
            <rect className="rc-tyre" x="23" y="17" width="6" height="3" rx="1" />
            {/* body: tapered nose on the right */}
            <path className="rc-body" d="M3 6.2C3 3.6 4.6 2 7.2 2H25.6C30.2 2 33.4 5.4 34 10C33.4 14.6 30.2 18 25.6 18H7.2C4.6 18 3 16.4 3 13.8Z" />
            {/* livery stripe: the route itself */}
            <rect x="4" y="8.6" width="29" height="2.8" rx="1.4" className="fill-route" />
            {/* glass */}
            <path className="rc-glass" d="M21.5 4.4H24.6C26.6 5.6 27.6 7.6 27.8 10C27.6 12.4 26.6 14.4 24.6 15.6H21.5Z" />
            <path className="rc-glass" d="M8.2 4.6H10.6V15.4H8.2C7.6 13.6 7.4 11.8 7.4 10C7.4 8.2 7.6 6.4 8.2 4.6Z" />
            {/* tail lights */}
            <rect className="rc-tail" x="2.4" y="4.2" width="1.8" height="3.4" rx="0.8" />
            <rect className="rc-tail" x="2.4" y="12.4" width="1.8" height="3.4" rx="0.8" />
          </g>
        </svg>
      </div>

      {/* one-word hint for drag/hold targets */}
      <div ref={labelPosRef} className="absolute top-0 left-0">
        <div ref={labelRef} className="rc-label rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-[0.08em] uppercase" />
      </div>
    </div>
  );
}
