"use client";

import { useEffect, useRef } from "react";
import { person } from "@/content/site";
import { gsap } from "@/lib/gsap";
import { scrollState } from "@/lib/stores";

const KOLKATA = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

const cell = "flex flex-col gap-3 border-night-line py-6";
const label = "t-map text-rock";

/**
 * The trip computer: four readouts. TRIP and LOCAL TIME update without re-rendering React (gsap.ticker / a
 * second-aligned timer write straight to their text nodes); POSITION is where the drive ends, Hanamkonda, as a
 * fixed GPS fix. It sits on one line when its cell has room and stacks latitude over longitude when it does not.
 */
export function TripComputer() {
  const tripRef = useRef<HTMLSpanElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let last = "";
    const tick = () => {
      const next = scrollState.km.toFixed(1);
      if (next === last || !tripRef.current) return;
      last = next;
      tripRef.current.textContent = next;
    };
    tick();
    gsap.ticker.add(tick);
    return () => gsap.ticker.remove(tick);
  }, []);

  useEffect(() => {
    let timer = 0;
    const tick = () => {
      if (clockRef.current) clockRef.current.textContent = KOLKATA.format(new Date());
      // re-align to the next whole second so the readout never drifts or skips
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 8);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <dl className="grid grid-cols-1 border-y border-night-line sm:grid-cols-2 lg:grid-cols-4">
      <div className={cell}>
        <dt className={label}>Trip</dt>
        <dd className="font-mono text-[1.375rem] leading-none tabular-nums">
          <span ref={tripRef}>0.0</span>
          <span className="ml-1.5 text-[0.875rem] text-rock-soft">km</span>
        </dd>
      </div>
      <div className={`${cell} max-sm:border-t sm:border-l sm:pl-7`}>
        <dt className={label}>Local time</dt>
        <dd className="font-mono text-[1.375rem] leading-none tabular-nums">
          <span ref={clockRef}>--:--:--</span>
          <span className="ml-1.5 text-[0.875rem] text-rock-soft">IST</span>
        </dd>
      </div>
      <div className={`${cell} @container max-lg:border-t lg:border-l lg:pl-7`}>
        <dt className={label}>Position</dt>
        <dd className="flex flex-col gap-y-2 font-mono text-[1.375rem] leading-none tabular-nums @[19.5rem]:flex-row @[19.5rem]:gap-x-[0.5em]">
          <span className="whitespace-nowrap">{person.coordinates.lat}</span>
          <span aria-hidden="true" className="hidden text-rock-soft @[19.5rem]:inline">
            ·
          </span>
          <span className="whitespace-nowrap">{person.coordinates.lng}</span>
        </dd>
      </div>
      <div className={`${cell} max-lg:border-t sm:border-l sm:pl-7`}>
        <dt className={label}>Built with</dt>
        <dd className="text-[1.0625rem] leading-snug font-medium">Next.js · GSAP · Lenis · OGL</dd>
      </div>
    </dl>
  );
}
