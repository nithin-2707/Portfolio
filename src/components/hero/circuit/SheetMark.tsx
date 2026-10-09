import { person } from "@/content/site";
import { PLACE } from "../parts";

/**
 * The map annotation for the sheet's top-left margin: a registration crosshair, then where the route begins.
 * Left-aligned twin of the hero's CoordinateLabel (the crosshair leads, the way a printed sheet marks its corner).
 */
export function SheetMark({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-2.5 ${className}`}>
      <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false" className="size-5 shrink-0 text-venice">
        <circle cx="10" cy="10" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.1" />
        <path d="M10 1v5.2M10 13.8V19M1 10h5.2M13.8 10H19" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
        <circle cx="10" cy="10" r="1.25" className="fill-route" />
      </svg>
      <span className="t-map flex flex-col gap-1 pt-[3px] leading-none text-ink">
        <span>
          {person.coordinates.lat}
          <span aria-hidden="true">&nbsp;&nbsp;</span> {person.coordinates.lng}
        </span>
        <span className="text-venice">{PLACE}</span>
      </span>
    </p>
  );
}
