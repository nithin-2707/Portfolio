"use client";

import { useEffect, useRef, type KeyboardEvent, type RefObject } from "react";
import { person } from "@/content/site";
import { gsap, useGSAP } from "@/lib/gsap";
import { prefersReducedMotion } from "@/lib/useReducedMotion";

export type MapStop = { id: string; label: string; km: string };

type Props = {
  open: boolean;
  stops: MapStop[];
  active: number;
  /** the Map button: the sheet unfolds from it and focus returns to it */
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: (target?: string) => void;
};

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Circle clip centred on the Map button, large enough to cover the far corner. */
function circleFrom(trigger: HTMLElement | null, open: boolean) {
  const r = trigger?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : window.innerWidth - 40;
  const y = r ? r.top + r.height / 2 : 32;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  return `circle(${open ? radius.toFixed(0) : 0}px at ${x.toFixed(0)}px ${y.toFixed(0)}px)`;
}

/**
 * Phone route index: a full-screen paper sheet unfolding from the Map button, listing every waypoint
 * on a vertical route with its distance marker. Modal: focus is trapped, Esc closes, the page is held.
 */
export function MapSheet({ open, stops, active, triggerRef, onClose }: Props) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const shownRef = useRef(false);

  useGSAP(
    () => {
      const sheet = sheetRef.current;
      if (!sheet) return;
      const reduced = prefersReducedMotion();
      const items = sheet.querySelectorAll("[data-map-item]");
      if (open) {
        shownRef.current = true;
        gsap.set(sheet, { visibility: "visible" });
        if (reduced) {
          gsap.fromTo(sheet, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: "power1.out" });
        } else {
          gsap.fromTo(
            sheet,
            { clipPath: circleFrom(triggerRef.current, false), opacity: 1 },
            { clipPath: circleFrom(triggerRef.current, true), duration: 0.6, ease: "road" },
          );
          gsap.fromTo(
            items,
            { y: 14, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "road", stagger: 0.035, delay: 0.1 },
          );
        }
        closeRef.current?.focus({ preventScroll: true });
      } else if (shownRef.current) {
        shownRef.current = false;
        const hide = () => gsap.set(sheet, { visibility: "hidden", clearProps: "clipPath,opacity" });
        if (reduced) gsap.to(sheet, { opacity: 0, duration: 0.18, ease: "power1.out", onComplete: hide });
        else gsap.to(sheet, { clipPath: circleFrom(triggerRef.current, false), duration: 0.38, ease: "steer", onComplete: hide });
        triggerRef.current?.focus({ preventScroll: true });
      }
    },
    { scope: sheetRef, dependencies: [open] },
  );

  // Esc closes from anywhere while open
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // focus trap
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab") return;
    const nodes = Array.from(sheetRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={sheetRef}
      id="route-map"
      role="dialog"
      aria-modal="true"
      aria-label="Route map"
      data-lenis-prevent
      inert={!open}
      onKeyDown={onKeyDown}
      className="invisible fixed inset-0 z-[70] flex flex-col overflow-y-auto overscroll-contain bg-paper text-ink lg:hidden"
    >
      <div className="mx-auto flex h-16 w-full max-w-[var(--container-route)] shrink-0 items-center justify-between px-[var(--gutter)]">
        <span
          aria-hidden="true"
          className="grid size-9 place-items-center rounded-full border-[1.5px] border-venice font-display text-[0.6rem] leading-none font-bold tracking-[-0.02em] text-venice"
        >
          NG
        </span>
        <button
          ref={closeRef}
          type="button"
          onClick={() => onClose()}
          className="-mr-2 inline-flex h-11 items-center gap-2 rounded-full px-3 text-[0.9375rem] font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
        >
          Close
          <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="size-4">
            <path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <nav aria-label="Route index" className="mx-auto w-full max-w-[var(--container-route)] flex-1 px-[var(--gutter)] pt-4 pb-12">
        <div className="relative">
          {/* the route itself: one vertical line through every stop */}
          <span aria-hidden="true" className="absolute top-7 bottom-7 left-[0.3125rem] w-px bg-venice/35" />
          <ol className="relative">
          {stops.map((stop, i) => {
            const isActive = i === active;
            return (
              <li key={stop.id} data-map-item>
                <a
                  href={`#${stop.id}`}
                  aria-current={isActive ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    onClose(stop.id);
                  }}
                  className="group flex min-h-14 items-center gap-5 py-2 transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.99]"
                >
                  <span
                    aria-hidden="true"
                    className={`relative z-10 size-[0.6875rem] shrink-0 rounded-full border-[1.5px] ${
                      isActive ? "border-route bg-route" : i < active ? "border-venice bg-venice" : "border-venice bg-paper"
                    }`}
                  />
                  <span className="font-display text-[clamp(1.4rem,6.4vw,1.85rem)] leading-none font-semibold tracking-[-0.03em]">
                    {stop.label}
                  </span>
                  <span className="ml-auto flex flex-col items-end gap-1 text-right">
                    <span className="font-mono text-[0.75rem] tracking-[0.06em] text-venice tabular-nums">KM {stop.km}</span>
                    {isActive ? <span className="text-[0.75rem] font-medium text-ink">You are here</span> : null}
                  </span>
                </a>
              </li>
            );
          })}
          </ol>
        </div>
      </nav>

      <div data-map-item className="mx-auto w-full max-w-[var(--container-route)] px-[var(--gutter)] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between border-t border-paper-line pt-5">
          <a
            href={person.resume}
            download
            className="inline-flex min-h-11 items-center text-[0.9375rem] font-medium underline decoration-ink/25 decoration-1 underline-offset-[0.3em] transition-[text-decoration-color] duration-200 hover:decoration-ink"
          >
            Resume
          </a>
          <a
            href={`mailto:${person.email}`}
            className="inline-flex min-h-11 items-center text-[0.875rem] text-ink/75 underline decoration-ink/20 decoration-1 underline-offset-[0.3em]"
          >
            {person.email}
          </a>
        </div>
      </div>
    </div>
  );
}
