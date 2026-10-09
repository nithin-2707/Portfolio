"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { licences } from "@/content/site";
import { useReducedMotion } from "@/lib/useReducedMotion";
import { readColors } from "@/lib/palette";
import type { GalleryItem } from "./CircularGallery";
import { CARD_H, CARD_W, drawLicenceCards, readFonts, shortIssuer } from "./licenceCards";
import { VerifyTab } from "./VerifyTab";

// ogl stays out of the first bundle and never runs on the server.
const CircularGallery = dynamic(() => import("./CircularGallery"), { ssr: false, loading: () => null });

type Deck = { items: GalleryItem[]; font: string; captionColor: string };

/**
 * The pinned stage: heading, the arc of licence cards and a read-out of the centred card.
 * Desktop (>= 1024): the stage pins for 150vh and the scroll turns the arc, card 1 to card 8.
 * Smaller screens: no pin; the arc turns as the section passes and can be dragged.
 * Reduced motion: no canvas at all, the HTML list below carries everything.
 */
export function LicenceStage({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const progress = useRef<number | null>(0);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [active, setActive] = useState(0);
  // On a phone the arc is only a few cards wide: a gentle bend keeps the cards readable instead of tumbling.
  const narrow = useMediaQuery("(max-width: 767px)");
  const reduced = useReducedMotion();

  // Draw the cards once, on the client only, when the stage is about two screens away:
  // early enough that the GPU uploads finish before the pin, late enough to stay out of the first load.
  useEffect(() => {
    const stage = stageRef.current;
    if (reduced || !stage) return;
    let alive = true;
    const draw = () => {
      const fonts = readFonts();
      drawLicenceCards(licences, fonts).then((images) => {
        if (!alive) return;
        setDeck({
          items: licences.map((l, i) => ({ image: images[i], text: shortIssuer(l.issuer) })),
          font: `600 26px ${fonts.display}`,
          captionColor: readColors().paper,
        });
      });
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        draw();
      },
      { rootMargin: "200% 0px" },
    );
    io.observe(stage);
    return () => {
      alive = false;
      io.disconnect();
    };
  }, [reduced]);

  // Scroll -> progress (a ref: the ogl loop reads it every frame, React never re-renders for it).
  useGSAP(
    () => {
      if (reduced) return;
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px)", () => {
        const st = ScrollTrigger.create({
          trigger: stageRef.current,
          start: "top top",
          end: () => `+=${Math.round(window.innerHeight * 1.5)}`,
          pin: true,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            progress.current = self.progress;
          },
          onRefresh: (self) => {
            progress.current = self.progress;
          },
        });
        progress.current = st.progress;
      });
      mm.add("(max-width: 1023px)", () => {
        const st = ScrollTrigger.create({
          trigger: canvasRef.current,
          start: "top 85%",
          end: "bottom 15%",
          onUpdate: (self) => {
            progress.current = self.progress;
          },
          onRefresh: (self) => {
            progress.current = self.progress;
          },
        });
        progress.current = st.progress;
      });
      return () => mm.revert();
    },
    { scope: stageRef, dependencies: [reduced], revertOnUpdate: true },
  );

  // Entrance: the cards "develop" like a print in a tray (blur and density settle), once they exist.
  useGSAP(
    () => {
      if (!deck || !canvasRef.current) return;
      gsap.fromTo(
        canvasRef.current,
        { autoAlpha: 0, filter: "blur(8px)", scale: 0.97 },
        { autoAlpha: 1, filter: "blur(0px)", scale: 1, duration: 1.1, ease: "road", clearProps: "filter,transform" },
      );
    },
    { scope: stageRef, dependencies: [deck !== null] },
  );

  // Read-out swap when the centred card changes: a quick fade, the line under it re-inks left to right.
  const first = useRef(true);
  useGSAP(
    () => {
      if (first.current) {
        first.current = false;
        return;
      }
      const el = readoutRef.current;
      if (!el) return;
      gsap.fromTo(el.querySelectorAll("[data-readout]"), { opacity: 0.25 }, { opacity: 1, duration: 0.24, ease: "road", stagger: 0.04, overwrite: true });
      gsap.fromTo(el.querySelector("[data-readout-rule]"), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "road", transformOrigin: "0% 50%", overwrite: true });
    },
    { scope: stageRef, dependencies: [active] },
  );

  const current = licences[active] ?? licences[0];
  // no gallery yet (or none at all under reduced motion): the scale only counts, nothing is lit
  const lit = deck && !reduced ? active : -1;

  return (
    // the outer div is a stable parent for the pin-spacer GSAP inserts around the stage
    <div>
      <div ref={stageRef} className={`relative flex flex-col pt-[var(--section-y)] ${reduced ? "" : "lg:h-[100svh] lg:pt-[clamp(5.5rem,11vh,8rem)]"}`}>
        <div className="mx-auto w-full max-w-[var(--container-route)] px-[var(--gutter)]">
          {/* centred on the arc's axis: the gallery is symmetric about the middle of the screen */}
          <header className="flex flex-col items-center text-center">
            {children}
            {/* a scale that counts the eight licences; the centred card's tick is lit (only while the arc is live) */}
            <div aria-hidden="true" className="relative mt-5 flex items-end gap-2 px-1.5 pb-px">
              <span className="absolute inset-x-0 bottom-0 h-px bg-rock/40" />
              {licences.map((l, i) => (
                <span
                  key={l.name}
                  className={`block h-2.5 w-[2px] origin-bottom transition-[background-color,scale] duration-200 ease-out ${
                    i === lit ? "scale-y-[1.7] bg-route" : "bg-rock"
                  }`}
                />
              ))}
            </div>
          </header>
        </div>

        {!reduced && (
          <>
            {/* without JS there is no gallery: drop its empty band and read-out (the list below has everything) */}
            <noscript>
              <style>{"[data-licence-canvas],[data-licence-readout]{display:none!important}"}</style>
            </noscript>
            <div ref={canvasRef} data-licence-canvas data-cursor data-cursor-label="Drag" className="relative mt-8 h-[420px] w-full lg:mt-4 lg:h-auto lg:min-h-0 lg:flex-1">
              {deck && (
                <CircularGallery
                  items={deck.items}
                  font={deck.font}
                  progressRef={progress}
                  onActiveChange={setActive}
                  cardSize={[CARD_W, CARD_H]}
                  bend={narrow ? 0.7 : 2}
                  wobble={0}
                  borderRadius={0.03}
                  scrollEase={0.12}
                  textColor={deck.captionColor}
                />
              )}
            </div>

            {/* read-out of the centred card; the list below is the accessible, crawlable copy */}
            <div
              ref={readoutRef}
              data-licence-readout
              aria-hidden="true"
              // reserves its space before the cards exist, so nothing shifts when they arrive
              style={{ visibility: deck ? "visible" : "hidden" }}
              className="mx-auto mt-6 w-full max-w-[var(--container-route)] px-[var(--gutter)] lg:mb-[clamp(1.5rem,4vh,3rem)]">
              <div className="grid items-end gap-x-8 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <div className="min-w-0">
                  <p data-readout className="max-w-[48ch] text-[clamp(1.05rem,1.5vw,1.3rem)] font-semibold leading-snug text-paper">
                    {current.name}
                  </p>
                  <p data-readout className="mt-2 flex flex-wrap items-baseline gap-x-3 text-[0.95rem] text-paper/75">
                    <span>{current.issuer}</span>
                    <span className="t-map text-paper/60">{current.issued}</span>
                  </p>
                  <span data-readout-rule className="mt-4 block h-px w-24 origin-left bg-paper/40" />
                </div>
                {current.verify && <VerifyTab href={current.verify} name={current.name} hidden />}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
