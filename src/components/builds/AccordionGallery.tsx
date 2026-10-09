"use client";

// Adapted from React Bits AccordionGallery (reactbits.dev, MIT + Commons Clause), re-skinned for the Builds chapters. Changes:
//  - Uses the site's registered gsap (custom "road"/"steer" eases) and the shared reduced-motion hook.
//  - Real list semantics (<ul>/<li>). Each panel holds a full-size <button aria-pressed> that opens it, so hover,
//    focus, tap and Arrow keys all work, and the screenshot keeps its real alt text for screen readers.
//  - next/image (fill + sizes) instead of a bare <img>; tinted ink shadow; inset focus ring (panels clip overflow).
//  - Controlled `activeIndex` / `onActiveChange`, so callouts and the caption follow the open shot.
//  - The open caption is marked by a 7px route-orange waypoint dot instead of upstream's vertical accent bar.
import Image from "next/image";
import { useCallback, useEffect, useRef, useSyncExternalStore, type KeyboardEvent } from "react";
import { gsap } from "@/lib/gsap";
import { useReducedMotion } from "@/lib/useReducedMotion";

const STACK_QUERY = "(max-width: 520px)";
function subscribeStack(cb: () => void) {
  const mq = window.matchMedia(STACK_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
/** True below 520px, where the accordion stacks vertically (matches the max-[520px] classes). */
function useStacked() {
  return useSyncExternalStore(subscribeStack, () => window.matchMedia(STACK_QUERY).matches, () => false);
}

export interface AccordionGalleryItem {
  image: string;
  label: string;
  alt: string;
}

export interface AccordionGalleryProps {
  items: AccordionGalleryItem[];
  /** Accessible name of the list, e.g. "ATScribe screenshots". */
  ariaLabel: string;
  activeIndex: number;
  onActiveChange: (index: number) => void;
  accentColor?: string;
  overlayColor?: string;
  textColor?: string;
  /** px number or any CSS length. */
  height?: number | string;
  gap?: number;
  radius?: number;
  expandRatio?: number;
  duration?: number;
  ease?: string;
  parallax?: number;
  tilt?: number;
  stagger?: number;
  trigger?: "hover" | "click";
  showLabels?: boolean;
  grayscale?: boolean;
  /** next/image `sizes` for one panel's image. */
  sizes?: string;
  /**
   * Fit mode: the open panel takes exactly this width/height ratio and shows the whole screenshot (no crop);
   * closed panels shrink to `collapsed` px tabs. The gallery height follows from its width.
   */
  aspect?: number;
  collapsed?: number;
  className?: string;
}

export default function AccordionGallery({
  items,
  ariaLabel,
  activeIndex,
  onActiveChange,
  accentColor = "var(--color-route)",
  overlayColor = "var(--color-ink)",
  textColor = "var(--color-paper)",
  height = 460,
  gap = 10,
  radius = 10,
  expandRatio = 0.6,
  duration = 0.6,
  ease = "road",
  parallax = 0.5,
  tilt = 6,
  stagger = 0.06,
  trigger = "hover",
  showLabels = true,
  grayscale = true,
  sizes = "(min-width: 1280px) 40vw, (min-width: 1024px) 50vw, 100vw",
  className = "",
  aspect,
  collapsed = 56,
}: AccordionGalleryProps) {
  const rootRef = useRef<HTMLUListElement>(null);
  const panelRefs = useRef<(HTMLLIElement | null)[]>([]);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const mediaRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dimRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const dotRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tabRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const textRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const tlRef = useRef<gsap.core.Timeline | null>(null);
  const firstRunRef = useRef(true);
  const mediaSizeRef = useRef(320);
  const growRef = useRef(4);
  const fit = typeof aspect === "number" && aspect > 0;
  const narrow = useStacked();

  const reduced = useReducedMotion();
  const count = items.length;
  const active = Math.min(Math.max(activeIndex, 0), Math.max(count - 1, 0));

  const setActive = (next: number) => {
    const value = ((next % count) + count) % count;
    if (value !== active) onActiveChange(value);
  };

  // Legibility gradient for the caption. Dimming of collapsed panels is its own layer (opacity-only, GPU friendly):
  // upstream read --ag-dim on a sibling of the element it was set on, so every panel stayed dimmed.
  // fit mode shows the whole screen, so the caption gradient only shades the bottom strip
  const overlayBg = fit
    ? `linear-gradient(180deg, transparent 78%, color-mix(in srgb, ${overlayColor} 58%, transparent) 100%)`
    : `linear-gradient(180deg, transparent 58%, color-mix(in srgb, ${overlayColor} 64%, transparent) 100%)`;

  const applyLayout = useCallback(
    (animate: boolean) => {
      const panels = panelRefs.current;
      if (!panels.length) return;

      const r = Math.min(Math.max(expandRatio, 0.2), 0.9);
      const grow = fit ? growRef.current : count > 1 ? (r * (count - 1)) / (1 - r) : 1;
      const mediaSize = mediaSizeRef.current;

      tlRef.current?.kill();
      const dur = animate && !reduced ? duration : 0;
      const tl = gsap.timeline();

      panels.forEach((panel, i) => {
        if (!panel) return;
        const isActive = i === active;
        const media = mediaRefs.current[i];
        const dot = dotRefs.current[i];
        const text = textRefs.current[i];

        // stacked phones lose the tilt (it reads as a rendering bug at that size)
        const rot = narrow || isActive ? 0 : i < active ? tilt : -tilt;
        tl.to(panel, { flexGrow: isActive ? grow : 1, rotateY: rot, duration: dur, ease }, 0);

        if (media) {
          const drift = Math.max(-1.5, Math.min(1.5, active - i));
          const shift = drift * parallax * mediaSize * 0.06;
          tl.to(
            media,
            {
              xPercent: -50,
              yPercent: -50,
              x: narrow ? 0 : isActive ? 0 : shift,
              y: narrow ? (isActive ? 0 : shift) : 0,
              "--ag-gray": grayscale ? (isActive ? 0 : 1) : 0,
              duration: dur,
              ease,
            },
            0,
          );
        }
        const dim = dimRefs.current[i];
        if (dim) tl.to(dim, { opacity: isActive ? 0 : fit ? 0.94 : 0.35, duration: isActive ? dur * 0.4 : dur, ease }, 0);

        const tab = tabRefs.current[i];
        if (tab) tl.to(tab, { opacity: isActive ? 0 : 1, duration: dur * (isActive ? 0.4 : 1), ease }, 0);

        if (showLabels && dot && text) {
          if (isActive) {
            tl.to([dot, text], { opacity: 1, x: 0, duration: dur, ease, stagger: reduced ? 0 : stagger }, 0);
          } else {
            tl.to([dot, text], { opacity: 0, x: reduced ? 0 : -14, duration: dur * 0.6, ease }, 0);
          }
        }
      });

      tlRef.current = tl;
    },
    [active, count, expandRatio, duration, ease, tilt, parallax, grayscale, showLabels, stagger, reduced, narrow, fit],
  );

  // Latest layout function for the ResizeObserver, so a resize never re-subscribes (or skips an active change).
  const layoutRef = useRef(applyLayout);
  useEffect(() => {
    layoutRef.current = applyLayout;
  }, [applyLayout]);

  // Measure the open panel's media size (it drives the parallax travel). Re-lays out instantly on resize.
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let first = true;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (fit && aspect) {
        // the open panel is exactly aspect-shaped and its image exactly fills it: nothing is cropped
        const tabs = (count - 1) * collapsed + gap * (count - 1);
        let open: number;
        if (narrow) {
          open = Math.max(120, rect.width / aspect); // open panel height when stacked
          el.style.height = `${Math.round(open + tabs)}px`;
        } else {
          open = Math.max(160, rect.width - tabs); // open panel width in a row
          el.style.height = `${Math.round(open / aspect)}px`;
        }
        growRef.current = count > 1 ? open / collapsed : 1;
        mediaSizeRef.current = open;
        el.style.setProperty("--ag-media-size", `${open}px`);
        layoutRef.current(false);
        first = false;
        return;
      }
      const total = narrow ? rect.height : rect.width;
      const usable = Math.max(total - gap * (count - 1), 120);
      const size = Math.max(140, usable * Math.min(Math.max(expandRatio, 0.2), 0.9) * 1.22);
      mediaSizeRef.current = size;
      el.style.setProperty("--ag-media-size", `${size}px`);
      if (!first) layoutRef.current(false);
      first = false;
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [gap, count, expandRatio, narrow, fit, aspect, collapsed]);

  useEffect(() => {
    applyLayout(!firstRunRef.current);
    firstRunRef.current = false;
  }, [applyLayout]);

  useEffect(
    () => () => {
      tlRef.current?.kill();
    },
    [],
  );

  const handleEnter = (i: number) => {
    if (trigger !== "hover") return;
    // a resting cursor "enters" panels while Lenis scrolls the page underneath it; ignore those
    if (document.documentElement.classList.contains("lenis-scrolling")) return;
    setActive(i);
  };

  const handleKeyDown = (i: number, e: KeyboardEvent<HTMLButtonElement>) => {
    let next: number | null = null;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (i + 1) % count;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = (i - 1 + count) % count;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = count - 1;
    if (next === null) return;
    e.preventDefault();
    buttonRefs.current[next]?.focus();
    setActive(next);
  };

  const heightCss =
    typeof height === "number" ? (narrow ? `${Math.round(height * 1.6)}px` : `${height}px`) : narrow ? `calc(${height} * 1.6)` : height;

  return (
    <ul
      ref={rootRef}
      aria-label={ariaLabel}
      className={`m-0 flex w-full max-w-full list-none flex-row p-0 [perspective:1400px] max-[520px]:!flex-col max-[520px]:[perspective:none] ${className}`}
      style={{ gap: `${gap}px`, height: fit ? undefined : heightCss, aspectRatio: fit && !narrow ? `${aspect! * 1.2}` : undefined }}
    >
      {items.map((item, i) => {
        const isActive = i === active;
        return (
          <li
            key={item.image}
            ref={(el) => {
              panelRefs.current[i] = el;
            }}
            className="group relative block min-h-0 min-w-0 flex-[1_1_0] overflow-hidden bg-ink [box-shadow:0_18px_36px_-22px_color-mix(in_srgb,var(--color-ink)_75%,transparent)] [transform-origin:center] [transform-style:preserve-3d] max-[520px]:min-h-[56px] max-[520px]:!transform-none"
            style={{ borderRadius: `${radius}px`, willChange: "transform" }}
            onMouseEnter={() => handleEnter(i)}
          >
            <span className="absolute inset-0 overflow-hidden [border-radius:inherit]">
              <span
                ref={(el) => {
                  mediaRefs.current[i] = el;
                }}
                className="absolute left-1/2 top-1/2 [filter:grayscale(var(--ag-gray,1))]"
                style={{
                  width: narrow ? "100%" : "var(--ag-media-size, 320px)",
                  height: narrow ? "var(--ag-media-size, 320px)" : "100%",
                  transform: "translate(-50%, -50%)",
                  willChange: "transform, filter",
                }}
              >
                <Image
                  src={item.image}
                  alt={item.alt}
                  fill
                  sizes={sizes}
                  draggable={false}
                  className="select-none object-cover object-top [-webkit-user-drag:none]"
                />
              </span>
              <span
                ref={(el) => {
                  dimRefs.current[i] = el;
                }}
                className="pointer-events-none absolute inset-0"
                style={{ background: overlayColor, opacity: isActive ? 0 : fit ? 0.94 : 0.35 }}
                aria-hidden="true"
              />
              {(!fit || showLabels) && (
                <span className="pointer-events-none absolute inset-0" style={{ background: overlayBg }} aria-hidden="true" />
              )}
            </span>

            {fit && (
              // closed tabs carry their name, read bottom-to-top like a map's margin label
              <span
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 z-[2] flex items-end justify-center pb-4 max-[520px]:items-center max-[520px]:justify-start max-[520px]:pb-0 max-[520px]:pl-4"
                style={{ opacity: isActive ? 0 : 1 }}
              >
                <span
                  className="text-[0.8rem] font-semibold tracking-[0.04em] whitespace-nowrap [writing-mode:vertical-rl] rotate-180 max-[520px]:rotate-0 max-[520px]:[writing-mode:horizontal-tb]"
                  style={{ color: textColor }}
                >
                  {item.label}
                </span>
              </span>
            )}

            {showLabels && (
              <span className="pointer-events-none absolute bottom-4 left-4 right-4 z-[2] flex items-center gap-2.5" aria-hidden="true">
                {/* route waypoint: the open shot is where you are on the road */}
                <span
                  ref={(el) => {
                    dotRefs.current[i] = el;
                  }}
                  className="size-[7px] flex-none rounded-full opacity-0"
                  style={{ background: accentColor }}
                />
                <span
                  ref={(el) => {
                    textRefs.current[i] = el;
                  }}
                  className="overflow-hidden text-ellipsis whitespace-nowrap text-[clamp(0.95rem,1.2vw,1.15rem)] font-semibold tracking-[0.01em] opacity-0"
                  style={{ color: textColor }}
                >
                  {item.label}
                </span>
              </span>
            )}

            <button
              ref={(el) => {
                buttonRefs.current[i] = el;
              }}
              type="button"
              aria-pressed={isActive}
              aria-label={`Show the ${item.label} screen`}
              className="absolute inset-0 z-[3] block cursor-pointer appearance-none border-0 bg-transparent p-0 [border-radius:inherit] focus-visible:[outline-offset:-5px]"
              onClick={() => setActive(i)}
              onFocus={() => setActive(i)}
              onKeyDown={(e) => handleKeyDown(i, e)}
            />
          </li>
        );
      })}
    </ul>
  );
}
