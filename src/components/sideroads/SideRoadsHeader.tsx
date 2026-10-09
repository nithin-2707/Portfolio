"use client";

import { useRef } from "react";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";

/** px of main route that must show before the junction, even on the narrowest screen */
const MIN_ENTRY = 12;

/**
 * Side roads header: the title is a place you reach by leaving the main route. The orange route enters
 * from the left edge of the screen and runs on across the section; a thinner Rock Blue branch peels off
 * it, climbs, and levels out at the title. The geometry is measured in real pixels (exact DrawSVG lengths,
 * strokes that never distort) and rebuilt whenever the header resizes. Both lines draw once on enter: the
 * route drives in, and at the junction it splits into the road ahead and the branch. Reduced motion shows
 * them drawn. Without JS there are no lines, only the title and deck.
 */
export function SideRoadsHeader() {
  const headerRef = useRef<HTMLElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const inRef = useRef<SVGPathElement>(null);
  const onRef = useRef<SVGPathElement>(null);
  const branchRef = useRef<SVGPathElement>(null);

  useGSAP(
    () => {
      const header = headerRef.current;
      const svg = svgRef.current;
      const title = titleRef.current;
      const routeIn = inRef.current;
      const routeOn = onRef.current;
      const branch = branchRef.current;
      if (!header || !svg || !title || !routeIn || !routeOn || !branch) return;

      let junction = 0;

      const layout = () => {
        const box = svg.getBoundingClientRect();
        const t = title.getBoundingClientRect();
        if (!box.width || !t.width) return;
        const cs = getComputedStyle(title);
        const fs = parseFloat(cs.fontSize) || 40;
        const lh = parseFloat(cs.lineHeight) || fs * 1.02;
        const f = (n: number) => n.toFixed(1);

        // the main route lies along the header's bottom edge
        const yRoad = box.height - 2;
        // the branch levels out at the middle of the title's first line and stops just short of the first letter
        const yEnd = t.top - box.top + lh * 0.54;
        const xEnd = t.left - box.left - fs * 0.3;
        const level = fs * 0.4;
        const rise = Math.max(0, yRoad - yEnd);
        const room = Math.max(0, xEnd - level - MIN_ENTRY);
        const run = Math.min(room, Math.max(rise * 1.25, 24));
        junction = xEnd - level - run;

        routeIn.setAttribute("d", `M-4 ${f(yRoad)}H${f(junction)}`);
        routeOn.setAttribute("d", `M${f(junction - 0.5)} ${f(yRoad)}H${f(box.width + 4)}`);
        // leaves the route tangentially (an exit ramp), climbs, arrives level: horizontal tangents at both ends
        branch.setAttribute(
          "d",
          `M${f(junction)} ${f(yRoad)}C${f(junction + run * 0.6)} ${f(yRoad)} ${f(junction + run * 0.4)} ${f(yEnd)} ${f(junction + run)} ${f(yEnd)}H${f(xEnd)}`,
        );
      };

      layout();
      // The header stops growing at the container cap while the full-bleed svg keeps tracking the viewport,
      // so both are observed (otherwise the route's right end goes stale on wide screens).
      const ro = new ResizeObserver(() => layout());
      ro.observe(header);
      ro.observe(svg);
      let alive = true;
      document.fonts?.ready.then(() => {
        if (alive) layout();
      });

      const lines = [routeIn, routeOn, branch];
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", (_mq, mqSafe) => {
        if (!mqSafe) return;
        // drive belongs to this media context, not the outer one: when the page loads already scrolled past the
        // header, ScrollTrigger fires onEnter inside create(), i.e. inside this context, and an outer-context
        // function run there nests the two contexts in each other, so gsap's revert recurses until the stack overflows.
        const drive = mqSafe(() => {
          layout();
          // Lengths are read now, from the final geometry; dash props are cleared after so a later resize shows whole lines.
          const enter = gsap.utils.clamp(0.3, 0.7, junction / 450);
          gsap
            .timeline({
              defaults: { ease: "road" },
              onComplete: () => {
                gsap.set(lines, { clearProps: "strokeDasharray,strokeDashoffset" });
              },
            })
            .set(lines, { visibility: "visible" })
            .fromTo(routeIn, { drawSVG: "0%" }, { drawSVG: "100%", duration: enter, ease: "none" })
            .addLabel("split")
            .fromTo(routeOn, { drawSVG: "0%" }, { drawSVG: "100%", duration: 1.25 }, "split")
            .fromTo(branch, { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.9 }, "split");
        });
        gsap.set(lines, { visibility: "hidden" });
        ScrollTrigger.create({ trigger: header, start: "top 80%", once: true, onEnter: () => drive() });
        return () => {
          gsap.set(lines, { clearProps: "visibility,strokeDasharray,strokeDashoffset" });
        };
      });

      return () => {
        alive = false;
        ro.disconnect();
      };
    },
    { scope: headerRef },
  );

  return (
    <header ref={headerRef} className="relative pb-[clamp(2.25rem,4.5vw,3.5rem)] pl-16 md:pl-28 lg:pl-[22%]">
      <svg
        ref={svgRef}
        aria-hidden="true"
        focusable="false"
        fill="none"
        className="pointer-events-none absolute inset-y-0 left-[calc(50%-50vw)] w-screen overflow-visible"
      >
        <path ref={branchRef} className="stroke-rock" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
        <path ref={inRef} className="stroke-route" strokeWidth={2.5} />
        <path ref={onRef} className="stroke-route" strokeWidth={2.5} />
      </svg>
      <h2 ref={titleRef} id="side-roads-title" className="t-heading relative">
        Side roads
      </h2>
      <p className="relative mt-4 max-w-[30ch] text-[1.125rem] leading-[1.5] text-paper/80">
        Smaller builds, for the curious. Under the hood only.
      </p>
    </header>
  );
}
