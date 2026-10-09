"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ReactLenis, useLenis, type LenisRef } from "lenis/react";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { scrollState, ROUTE_KM, launched } from "@/lib/stores";

/**
 * Writes scroll telemetry into the mutable store every Lenis frame, keeps
 * ScrollTrigger in step, and holds the page still until the loader launches.
 */
function ScrollBridge() {
  const lenis = useLenis((l) => {
    scrollState.y = l.scroll;
    scrollState.progress = Number.isFinite(l.progress) ? l.progress : 0;
    scrollState.velocity = l.velocity;
    scrollState.km = scrollState.progress * ROUTE_KM;
    ScrollTrigger.update();
  });

  useEffect(() => {
    if (!lenis) return;
    if (!launched.get()) lenis.stop();
    return launched.subscribe(() => {
      if (!launched.get()) return;
      lenis.start();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    });
  }, [lenis]);

  return null;
}

/**
 * One clock for the whole site: GSAP's ticker drives Lenis, Lenis drives
 * ScrollTrigger, canvases read the store.
 */
export function SmoothScroll({ children }: { children: ReactNode }) {
  const lenisRef = useRef<LenisRef>(null);

  useEffect(() => {
    const tick = (time: number) => lenisRef.current?.lenis?.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    // Fonts change line breaks, so trigger positions move: re-measure once they land.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    return () => gsap.ticker.remove(tick);
  }, []);

  return (
    <ReactLenis
      root
      ref={lenisRef}
      options={{
        autoRaf: false,
        lerp: 0.09,
        smoothWheel: true,
        syncTouch: false,
        stopInertiaOnNavigate: true,
        // respectReducedMotion (lenis 1.3.26, default true) makes scrolling instant under reduced motion
      }}
    >
      <ScrollBridge />
      {children}
    </ReactLenis>
  );
}
