"use client";

import { useLenis } from "lenis/react";

/** Ease-out quart: leaves fast, settles gently at the top. */
const settle = (t: number) => 1 - Math.pow(1 - t, 4);

/**
 * Back to start: a round U-turn button. On hover the U-turn swings 180° to point home; on click Lenis drives
 * the page back to the top (instantly under reduced motion, which Lenis handles), then focus moves to the
 * start of the route so keyboard users continue from the top rather than from the footer.
 */
export function BackToStart() {
  const lenis = useLenis();

  const landFocus = () => {
    const start = document.getElementById("start");
    if (!start) return;
    const hadTabIndex = start.hasAttribute("tabindex");
    if (!hadTabIndex) start.setAttribute("tabindex", "-1");
    const previousOutline = start.style.outline;
    start.style.outline = "none";
    start.focus({ preventScroll: true });
    start.addEventListener(
      "blur",
      () => {
        start.style.outline = previousOutline;
        if (!hadTabIndex) start.removeAttribute("tabindex");
      },
      { once: true },
    );
  };

  const goHome = () => {
    if (lenis) {
      lenis.scrollTo(0, { duration: 1.6, easing: settle, onComplete: landFocus });
      return;
    }
    window.scrollTo({ top: 0 });
    landFocus();
  };

  return (
    <button
      type="button"
      onClick={goHome}
      className="group inline-flex min-h-11 items-center gap-4 self-start rounded-full text-[0.9375rem] font-medium transition-transform duration-150 ease-out active:scale-[0.97] md:self-auto"
    >
      Back to start
      <span className="grid size-14 place-items-center rounded-full border border-paper/35 transition-colors duration-200 group-hover:border-paper group-hover:bg-paper group-hover:text-night group-focus-visible:border-paper">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
          className="size-5 transition-transform duration-500 ease-in-out group-hover:rotate-180 motion-reduce:transition-none"
        >
          <path d="M16.5 20V9.5a4.5 4.5 0 0 0-9 0V17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          <path
            d="M4 13.5 7.5 17l3.5-3.5"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
