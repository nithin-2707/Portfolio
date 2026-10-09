import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** Reduced motion means fewer, gentler animations: keep fades, drop travel and 3D motion. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  );
}

export function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia(QUERY).matches;
}
