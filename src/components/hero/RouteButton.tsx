"use client";

import { useLenis } from "lenis/react";
import type { MouseEvent } from "react";

const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);

function Chevron({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className={className}>
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "View the route": the hero's ink pill. On hover the chevron changes lanes: the current one drives
 * out to the right while the next enters from the left. A plain anchor without JS; with Lenis the
 * page drives to the next waypoint instead of jumping.
 */
export function RouteButton({ href, children }: { href: `#${string}`; children: string }) {
  const lenis = useLenis();

  const onClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!lenis) return;
    e.preventDefault();
    lenis.scrollTo(href, {
      duration: 1.4,
      easing: easeOutQuart,
      onComplete: () => {
        const el = document.querySelector<HTMLElement>(href);
        if (!el) return;
        if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
        el.focus({ preventScroll: true });
      },
    });
    history.replaceState(null, "", href);
  };

  return (
    <a
      href={href}
      onClick={onClick}
      className="group inline-flex h-12 items-center gap-2.5 rounded-full bg-ink pr-1.5 pl-5 sm:gap-3 sm:pl-6 text-[0.95rem] font-medium tracking-[-0.005em] text-paper transition-[transform,background-color] duration-200 ease-[var(--ease-out)] select-none hover:bg-venice-deep active:scale-[0.97]"
    >
      {children}
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-full bg-paper/12">
        <Chevron className="size-4 transition-transform duration-[240ms] ease-[var(--ease-out)] group-hover:translate-x-[180%]" />
        <Chevron className="absolute size-4 -translate-x-[180%] transition-transform delay-[50ms] duration-[240ms] ease-[var(--ease-out)] group-hover:translate-x-0" />
      </span>
    </a>
  );
}
