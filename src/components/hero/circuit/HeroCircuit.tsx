import { areas } from "@/content/areas";
import { person } from "@/content/site";
import { HeroCopy } from "../HeroCopy";
import { NAME_LINES, ResumeTicket } from "../parts";
import { RouteButton } from "../RouteButton";
import { StrokeText } from "../StrokeText";
import { CircuitMap } from "./CircuitMap";
import { SheetMark } from "./SheetMark";

/**
 * Start (waypoint 1), variant "Circuit": the name inked on plain paper, and beside it a printed circuit map
 * whose five sectors are the five areas I work in. A car laps it and cues each sector as it drives
 * through; the pointer, a tap or the keyboard cues one directly. Every word here is server-rendered, and the
 * list under the map carries what the drawing shows for screen readers.
 */
export function HeroCircuit() {
  return (
    <section
      id="start"
      aria-labelledby="start-title"
      data-waypoint="start"
      className="relative isolate min-h-[100dvh] overflow-hidden bg-paper"
    >
      <div className="relative mx-auto grid min-h-[100dvh] max-w-[var(--container-route)] grid-cols-1 content-start gap-y-12 px-[var(--gutter)] pt-[calc(64px+clamp(2rem,7vh,4rem))] pb-[clamp(2.5rem,6vh,4rem)] xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] xl:content-center xl:items-stretch xl:gap-x-[clamp(2rem,4vw,4.5rem)] xl:pt-[calc(64px+1.25rem)] xl:pb-[clamp(1.5rem,4vh,2.75rem)]">
        {/* the sheet's margin: where the route begins at the top, the name inked at the bottom */}
        <div className="flex flex-col gap-10 xl:h-full xl:justify-between">
          <SheetMark />
          <HeroCopy className="max-w-full xl:pb-[clamp(0.25rem,2vh,1.5rem)]">
            <StrokeText
              id="start-title"
              lines={NAME_LINES}
              className="t-display text-[clamp(2.6rem,7.4vw,4.6rem)] text-ink max-[359px]:text-[2.3rem] xl:text-[clamp(2.6rem,4.7vw,4.6rem)]"
            />
            <p className="mt-6 max-w-[34ch] text-[clamp(1.0625rem,1.6vw,1.25rem)] leading-[1.45] text-ink/85">
              <span className="font-semibold text-ink">{person.role}.</span> {person.tagline}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-2 sm:gap-3">
              <RouteButton href="#profile">View the route</RouteButton>
              <ResumeTicket />
            </div>
          </HeroCopy>
        </div>

        <div className="w-full max-w-[48rem] xl:ml-auto xl:max-w-[calc((100dvh-64px-3.5rem)*1000/840)]">
          <CircuitMap />
          {/* what the drawing shows, as text */}
          <ul className="sr-only">
            {areas.map((a, k) => (
              <li key={a.id}>
                <span>
                  Sector {k + 1}, {a.label}.
                </span>{" "}
                <span id={`circuit-area-${a.id}`}>
                  {a.proof} Where: {a.where}. Tools: {a.tools.join(", ")}.
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
