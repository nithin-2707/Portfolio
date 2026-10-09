import { useSyncExternalStore } from "react";

/**
 * Tiny external stores. Values that change every frame (scroll) live in a
 * mutable object read inside animation loops; values that change rarely
 * (loader finished) are exposed through useSyncExternalStore.
 */

/** Per-frame scroll telemetry, written by SmoothScroll, read by canvas/raf loops. Never put this in React state. */
export const scrollState = {
  /** page scroll in px */
  y: 0,
  /** 0..1 progress of the whole page */
  progress: 0,
  /** px per frame, signed */
  velocity: 0,
  /** total route length in km shown by the odometer (progress * ROUTE_KM) */
  km: 0,
};

/** The whole page maps onto a 42.2 km stage (a marathon distance, no claim attached). */
export const ROUTE_KM = 42.2;

type Listener = () => void;

function createFlag(initial: boolean) {
  let value = initial;
  const listeners = new Set<Listener>();
  return {
    get: () => value,
    set(next: boolean) {
      if (next === value) return;
      value = next;
      listeners.forEach((l) => l());
    },
    subscribe(l: Listener) {
      listeners.add(l);
      return () => {
        listeners.delete(l);
      };
    },
  };
}

/** True once the launch loader has finished and the page is revealed. */
export const launched = createFlag(false);

export function useLaunched() {
  return useSyncExternalStore(launched.subscribe, launched.get, () => false);
}

/** Real time the launch took, in seconds, reported by the loader ("0–100 in 2.31 s"). */
export const launchTime = { seconds: 0 };

/**
 * True once the hero has painted its first frame (the circuit map), or has decided there is nothing to wait
 * for (static fallback, or the page loaded scrolled past the hero). One of the loader's readiness signals.
 */
export const heroReady = createFlag(false);
