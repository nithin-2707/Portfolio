import { person } from "@/content/site";
import { outlineFont } from "@/components/stages/outlineFont";
import { BackToStart } from "./BackToStart";
import ScrollVelocity from "./ScrollVelocity";
import { TripComputer } from "./TripComputer";

/** A small route-orange waypoint between the words of the marquee. */
function Dot() {
  return <span className="mx-[0.3em] inline-block size-[0.15em] rounded-full bg-rock align-[0.27em]" />;
}

function Phrase() {
  return (
    <>
      Nithin Gandrathi
      <Dot />
      Software engineer
      <Dot />
    </>
  );
}

/**
 * Footer: night. The name runs as a speed-sensitive marquee (faster and reversing with your scroll), then a trip
 * computer reads back the drive: distance, local time in Hanamkonda, where the route ends and the build.
 */
export function Footer() {
  return (
    <footer data-nav-tone="dark" className="relative overflow-hidden bg-night text-paper">
      <div className="pt-[clamp(4.5rem,10vw,8.5rem)]">
        <ScrollVelocity
          label="Nithin Gandrathi, software engineer"
          velocity={56}
          numCopies={3}
          className="text-[clamp(3rem,11vw,9.5rem)] leading-[0.95] tracking-[-0.02em] uppercase"
          rows={[
            {
              content: <Phrase />,
              className: `${outlineFont.className} text-transparent [-webkit-text-stroke:1px_var(--color-paper)]`,
            },
            { content: <Phrase />, className: `${outlineFont.className} text-rock-soft` },
          ]}
        />
      </div>

      <div className="mx-auto max-w-[var(--container-route)] px-[var(--gutter)] pt-[clamp(3.5rem,7vw,6rem)] pb-[clamp(2rem,4vw,3rem)]">
        <TripComputer />

        <div className="mt-[clamp(2.5rem,5vw,4rem)] flex flex-col gap-6 md:flex-row md:items-center md:justify-between md:gap-8">
          <p className="text-[0.9375rem] text-paper/80">© 2026 Nithin Gandrathi</p>
          <a
            href={`mailto:${person.email}`}
            className="text-[0.9375rem] font-medium break-words underline decoration-paper/35 decoration-1 underline-offset-[0.25em] transition-[text-decoration-color] duration-200 hover:decoration-paper"
          >
            {person.email}
          </a>
          <BackToStart />
        </div>

        <p className="mt-10 max-w-[64ch] text-[0.75rem] leading-5 text-rock">
          Tool and brand marks come from theSVG (thesvg.org) and are shown only to name the tools; each belongs to its
          owner.
        </p>
      </div>
    </footer>
  );
}
