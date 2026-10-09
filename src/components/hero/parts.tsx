import { person } from "@/content/site";

/** The hero's small printed pieces: the name lines and the resume ticket. */

export const NAME_LINES = [person.givenName, person.familyName] as const;
export const PLACE = `${person.location.split(",")[0]}, IN`;

function DownloadGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false" className="size-4">
      <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M3 13.5h10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * "Resume": a luggage-tag ticket. The notch on its left edge is cut with a mask, a perforation
 * separates the stub, and on hover the arrow dips toward the tray like a download.
 */
export function ResumeTicket() {
  return (
    <a
      href={person.resume}
      download
      className="group inline-flex rounded-[10px] text-ink transition-transform duration-200 ease-[var(--ease-out)] select-none active:scale-[0.97]"
    >
      {/* the mask lives on the body so the anchor's focus ring is never cut away */}
      <span className="inline-flex h-12 items-stretch rounded-[3px_10px_10px_3px] bg-rock-soft transition-colors duration-200 ease-[var(--ease-out)] [mask:radial-gradient(circle_at_0_50%,transparent_7px,#000_7.5px)] group-hover:bg-rock">
        <span className="flex items-center gap-2 pr-3.5 pl-4 text-[0.95rem] font-medium sm:gap-2.5 sm:pr-4 sm:pl-5">
          <span className="transition-transform duration-200 ease-[var(--ease-out)] group-hover:translate-y-[2px]">
            <DownloadGlyph />
          </span>
          Resume
        </span>
        <span className="flex items-center border-l border-dashed border-ink/30 px-3 text-[0.72rem] font-semibold tracking-[0.1em] text-ink sm:px-3.5">
          PDF
        </span>
      </span>
    </a>
  );
}
