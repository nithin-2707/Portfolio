"use client";

import Image from "next/image";
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { useLenis } from "lenis/react";
import { sideRoads } from "@/content/site";
import { gsap, useGSAP } from "@/lib/gsap";

const HOVER_QUERY = "(hover: hover) and (pointer: fine)";
const CARD_W = 420;
const CARD_H = 214;
/** gap between the cursor and the card edge */
const OFFSET = 28;

type Point = { x: number; y: number };

/** Built inside the GSAP context (so every tween it makes is reverted with it); read from event handlers. */
type FollowerApi = {
  show: (index: number, at?: Point) => void;
  hide: () => void;
  /** re-anchor the card to the last pointer position */
  follow: () => void;
};

/** A drawn arrow that turns -45° (to point up-right) when its row is hovered. */
function Arrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="size-5 shrink-0 transition-transform duration-300 ease-out group-hover:-rotate-45 group-focus-visible:-rotate-45 motion-reduce:transition-none"
    >
      <path d="M4 12h15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * A roadbook tulip for "turn off here": the dot is where you come from, the main road runs on straight
 * (thin), and the exit you take forks right in route orange with an arrowhead. Same glyph on every row,
 * like a legend symbol. viewBox 32 x 32, so strokes are true pixels at 32px.
 */
function JunctionTulip() {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="size-[clamp(1.75rem,2.9vw,2.25rem)] shrink-0 overflow-visible"
    >
      <path d="M12 19V3.5" className="stroke-current" strokeOpacity={0.5} strokeWidth={1.25} strokeLinecap="round" />
      <path d="M12 27.5V19" className="stroke-current" strokeWidth={1.5} strokeLinecap="round" />
      <path
        d="M12 19C12 14.5 19.1 10.7 23.6 8.5"
        className="stroke-route"
        strokeWidth={2.25}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        points="27.86,6.32 24.11,12.22 20.89,5.78"
        className="fill-route stroke-route"
        strokeWidth={0.6}
        strokeLinejoin="round"
      />
      <circle cx="12" cy="27.5" r="2.4" className="fill-current" />
    </svg>
  );
}

/**
 * The side-roads list: each row is one GitHub link. On pointer devices a screenshot card trails the cursor
 * (gsap.quickTo, spring-like), tilts with horizontal speed and cross-fades through a 2px blur when you move
 * to the other row. On touch, the screenshot sits inline under the row instead. Live URLs are never rendered.
 */
export function SideRoadList() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const api = useRef<FollowerApi | null>(null);
  const pointer = useRef({ x: 0, y: 0, has: false });

  // decode the preview screenshots before the rows arrive, so the first hover never stalls a frame on a decode
  useEffect(() => {
    const card = cardRef.current;
    const wrap = wrapRef.current;
    if (!card || !wrap) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        const decodes = Array.from(card.querySelectorAll("img")).map((img) => {
          img.loading = "eager";
          return img.decode().catch(() => {});
        });
        // then paint the card once, invisibly, so its shadowed layer and textures are rastered before the first hover
        void Promise.all(decodes).then(() => {
          if (card.style.opacity && card.style.opacity !== "0") return;
          card.style.opacity = "0.001";
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (card.style.opacity === "0.001") card.style.opacity = "0";
            }),
          );
        });
      },
      { rootMargin: "800px 0px" },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, []);

  useGSAP(
    (_context, contextSafe) => {
      const wrap = wrapRef.current;
      const card = cardRef.current;
      if (!wrap || !card || !contextSafe) return;
      const mm = gsap.matchMedia();

      // Hairlines between rows draw in from the left, once.
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(wrap.querySelectorAll("[data-hairline]"), {
          scaleX: 0,
          transformOrigin: "0% 50%",
          duration: 1.2,
          ease: "steer",
          stagger: 0.14,
          scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
        });
      });

      // The follower only exists for a fine pointer that can hover.
      mm.add({ hover: HOVER_QUERY, reduce: "(prefers-reduced-motion: reduce)" }, (ctx) => {
        const { hover, reduce } = ctx.conditions as { hover: boolean; reduce: boolean };
        if (!hover) return;

        const previews = gsap.utils.toArray<HTMLElement>("[data-preview]", card);
        gsap.set(card, { yPercent: -50, scale: reduce ? 1 : 0.92, autoAlpha: 0 });
        gsap.set(previews, { autoAlpha: 0, filter: "blur(2px)" });

        // Spring-like trailing on pointer devices; 1:1 under reduced motion (no animated travel).
        const follow = reduce ? 0 : 0.45;
        const xTo = gsap.quickTo(card, "x", { duration: follow, ease: "power3" });
        const yTo = gsap.quickTo(card, "y", { duration: follow, ease: "power3" });
        const rotateTo = reduce ? null : gsap.quickTo(card, "rotation", { duration: 0.6, ease: "power3" });
        let active = -1;
        let lastX = 0;
        let tilting = false;

        // Horizontal speed -> a few degrees of tilt, settling level when the cursor rests.
        const tiltTick = () => {
          const vx = pointer.current.x - lastX;
          lastX = pointer.current.x;
          rotateTo?.(gsap.utils.clamp(-6, 6, vx * 0.35));
        };
        const startTilt = () => {
          if (tilting || !rotateTo) return;
          tilting = true;
          lastX = pointer.current.x;
          gsap.ticker.add(tiltTick);
        };
        const stopTilt = () => {
          if (!tilting) return;
          tilting = false;
          gsap.ticker.remove(tiltTick);
          rotateTo?.(0);
        };

        /** Beside the cursor (or a focused row), flipping sides near the right edge. */
        const place = (immediate: boolean, at?: Point) => {
          const rect = wrap.getBoundingClientRect();
          const px = (at ? at.x : pointer.current.x) - rect.left;
          const py = (at ? at.y : pointer.current.y) - rect.top;
          const flip = px + OFFSET + CARD_W > rect.width;
          const tx = flip ? px - OFFSET - CARD_W : px + OFFSET;
          const ty = gsap.utils.clamp(CARD_H * 0.5, Math.max(CARD_H * 0.5, rect.height - CARD_H * 0.5), py);
          if (immediate) {
            xTo(tx, tx);
            yTo(ty, ty);
          } else {
            xTo(tx);
            yTo(ty);
          }
        };

        const show = contextSafe((index: number, at?: Point) => {
          if (active === -1) {
            place(true, at);
            gsap.to(card, { autoAlpha: 1, scale: 1, duration: reduce ? 0.2 : 0.35, ease: "road", overwrite: "auto" });
          } else if (at) {
            place(false, at);
          }
          if (active !== index) {
            previews.forEach((el, i) => {
              gsap.to(el, {
                autoAlpha: i === index ? 1 : 0,
                filter: i === index ? "blur(0px)" : "blur(2px)",
                duration: 0.3,
                ease: "road",
                overwrite: "auto",
              });
            });
          }
          active = index;
          if (!at) startTilt();
        });

        const hide = contextSafe(() => {
          if (active === -1) return;
          active = -1;
          stopTilt();
          gsap.to(card, {
            autoAlpha: 0,
            scale: reduce ? 1 : 0.92,
            duration: reduce ? 0.2 : 0.25,
            ease: "road",
            overwrite: "auto",
          });
        });

        api.current = {
          show,
          hide,
          follow: () => {
            if (active !== -1 && pointer.current.has) place(false);
          },
        };

        return () => {
          api.current = null;
          gsap.ticker.remove(tiltTick);
        };
      });
    },
    { scope: wrapRef },
  );

  // Lenis moves the list under a resting cursor without any pointer event, so re-anchor on every scroll frame.
  useLenis(() => api.current?.follow());

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") return;
    pointer.current.x = e.clientX;
    pointer.current.y = e.clientY;
    pointer.current.has = true;
    api.current?.follow();
  };

  return (
    <div
      ref={wrapRef}
      className="relative"
      onPointerMove={onPointerMove}
      onPointerLeave={(e) => {
        if (e.pointerType !== "touch") api.current?.hide();
      }}
    >
      <ul className="group/list relative">
        {sideRoads.map((road, i) => {
          const slug = road.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          const nameId = `side-road-${slug}`;
          const lineId = `${nameId}-line`;
          const ghId = `${nameId}-gh`;
          return (
            <li key={road.name} className="relative">
              <span data-hairline="" aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-night-line" />
              {i === sideRoads.length - 1 ? (
                <span data-hairline="" aria-hidden="true" className="absolute inset-x-0 bottom-0 h-px bg-night-line" />
              ) : null}
              <a
                href={road.github}
                target="_blank"
                rel="noopener noreferrer"
                aria-labelledby={`${nameId} ${ghId}`}
                aria-describedby={lineId}
                onPointerEnter={(e) => {
                  if (e.pointerType === "touch") return;
                  pointer.current.x = e.clientX;
                  pointer.current.y = e.clientY;
                  pointer.current.has = true;
                  // a row sliding under a resting cursor while the page scrolls is not a hover
                  if (document.documentElement.classList.contains("lenis-scrolling")) return;
                  api.current?.show(i, { x: e.clientX, y: e.clientY });
                }}
                onFocus={(e) => {
                  if (!e.currentTarget.matches(":focus-visible") || !window.matchMedia(HOVER_QUERY).matches) return;
                  const r = e.currentTarget.getBoundingClientRect();
                  api.current?.show(i, { x: r.left + r.width * 0.62, y: r.top + r.height / 2 });
                }}
                onBlur={() => api.current?.hide()}
                className="group grid gap-y-4 py-[clamp(2rem,4.5vw,3.5rem)] transition-[opacity,transform] duration-200 ease-out active:scale-[0.99] lg:grid-cols-12 lg:items-baseline lg:gap-x-8 [@media(hover:hover)]:group-has-[a:hover]/list:[&:not(:hover)]:opacity-45"
              >
                {/* the tulip's foot sits on the name's baseline */}
                <div className="flex items-baseline gap-[clamp(0.75rem,1.6vw,1.25rem)] lg:col-span-6">
                  <JunctionTulip />
                  <h3
                    id={nameId}
                    className="min-w-0 font-display text-[clamp(1.8rem,4vw,3.2rem)] leading-[1] font-bold tracking-[-0.03em] transition-transform duration-300 ease-out group-hover:translate-x-3 motion-reduce:transition-none"
                  >
                    {road.name}
                  </h3>
                </div>
                <div className="lg:col-span-4">
                  <p id={lineId} className="max-w-[46ch] text-[1.0625rem] leading-[1.55] text-paper/85">
                    {road.line}
                  </p>
                  <p className="mt-3 text-[0.9375rem] leading-6 text-paper/70">{road.stack.join(", ")}</p>
                </div>
                <span className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium lg:col-span-2 lg:justify-self-end">
                  <span id={ghId}>
                    GitHub<span className="sr-only">, opens in a new tab</span>
                  </span>
                  <Arrow />
                </span>
                <span className="relative mt-2 block aspect-video overflow-hidden rounded-[10px] border border-rock/40 lg:col-span-12 [@media(hover:hover)_and_(pointer:fine)]:hidden">
                  <Image
                    src={road.image}
                    alt={road.alt}
                    fill
                    sizes="(min-width: 1024px) 80vw, 100vw"
                    className="object-cover object-top"
                  />
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      <div
        ref={cardRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-0 z-10 hidden h-[214px] w-[420px] overflow-hidden rounded-[10px] border border-rock bg-night-2 opacity-0 shadow-[0_28px_60px_-18px_rgba(2,12,20,0.8),0_6px_14px_-6px_rgba(2,12,20,0.5)] will-change-transform [@media(hover:hover)_and_(pointer:fine)]:block"
      >
        {sideRoads.map((road) => (
          <span key={road.name} data-preview="" className="absolute inset-0">
            <Image src={road.image} alt="" fill sizes="420px" className="object-cover object-top" />
          </span>
        ))}
      </div>
    </div>
  );
}
