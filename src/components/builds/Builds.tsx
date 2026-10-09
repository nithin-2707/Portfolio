import { Fragment } from "react";
import { builds, type Build } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { BuildFigure } from "./BuildFigure";
import { LiveButton } from "./LiveButton";
import { TitleRoad } from "./TitleRoad";
import { WarmUp } from "./WarmUp";
import { contourTexture } from "@/lib/contourTexture";

/**
 * Strongest in the empty top margin, about a third of full strength where the title and deck sit, and fully
 * transparent at the layer's bottom edge (the header rule), so no texture edge ever shows.
 */
const HEADER_MASK =
  "radial-gradient(ellipse 85% 100% at 62% 0%, #000 0%, #000 30%, rgb(0 0 0 / 0.35) 62%, transparent 92%)";

/**
 * Builds (paper). Two case-study chapters. Each opens with its legend (identity and facts, the sides
 * swapping between chapters) and then lays its screens out full width, so every screenshot shows whole.
 * All copy is server-rendered; the gallery, callouts and the Live button are the only client islands.
 */
export function Builds() {
  return (
    <section id="builds" aria-labelledby="builds-title" data-waypoint="builds" className="relative bg-paper py-[var(--section-y)] text-ink">
      {/* The atlas sheet behind the title block: full strength only in the empty top margin, faded to nothing
          by the header rule, so the deck and the chapters below sit on plain paper. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[calc(var(--section-y)+clamp(10rem,20vw,15rem))] opacity-60"
        style={{ maskImage: HEADER_MASK, WebkitMaskImage: HEADER_MASK }}
      >
        <div className="size-full bg-rock" style={contourTexture("max(100%, 100rem) auto", "top")} />
      </div>

      <div className="relative mx-auto max-w-[var(--container-route)] px-[var(--gutter)]">
        <header className="grid gap-6 border-b border-ink/15 pb-10 lg:grid-cols-12 lg:items-end lg:gap-x-6 lg:pb-14">
          <h2 id="builds-title" className="t-display text-[clamp(2.8rem,8vw,6rem)] text-ink lg:col-span-7">
            Builds
          </h2>
          <p className="max-w-[34ch] text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug text-ink/80 lg:col-span-4 lg:col-start-9 lg:pb-2">
            Two products I designed, built and shipped end to end.
          </p>
        </header>

        <div className="mt-[clamp(4rem,9vw,8rem)] flex flex-col gap-[clamp(6rem,16vh,11rem)]">
          {builds.map((build, i) => (
            <BuildChapter key={build.slug} build={build} flip={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}

function BuildChapter({ build, flip }: { build: Build; flip: boolean }) {
  const titleId = `build-${build.slug}-title`;
  return (
    <article aria-labelledby={titleId}>
      {/* the chapter's legend: identity on one side, the facts on the other; the sides swap per chapter */}
      <div className="grid items-end gap-y-8 lg:grid-cols-12 lg:gap-x-6">
        {/* a size container: the wide display face cannot wrap a one-word name, so the title scales to its column */}
        <div className={`@container lg:col-span-5 lg:row-start-1 ${flip ? "lg:col-start-8" : "lg:col-start-1"}`}>
          <h3
            id={titleId}
            className="font-display text-[clamp(2rem,12cqi,4.2rem)] font-[720] leading-[0.95] tracking-[-0.03em] text-ink"
          >
            {build.name}
          </h3>
          <TitleRoad />
          <p className="mt-3 text-[1.125rem] italic text-ink/75">{build.kind}</p>
          <p className="t-map mt-4 text-venice">{build.period}</p>
          <p className="mt-7 max-w-[30ch] text-[1.35rem] font-medium leading-[1.3] text-ink">{build.pitch}</p>
        </div>

        <div className={`lg:col-span-6 lg:row-start-1 ${flip ? "lg:col-start-1" : "lg:col-start-7"}`}>
          <p className="max-w-[52ch] text-base leading-relaxed text-ink/75">{build.story}</p>

          <p className="mt-5 text-[0.9375rem] font-medium leading-relaxed text-venice">
            <span className="mr-2.5 font-semibold text-ink">Spec sheet</span>
            {build.stack.map((item, i) => (
              <Fragment key={item}>
                {/* break only between items, never inside "MongoDB Atlas" */}
                {i > 0 && <wbr />}
                <span className="whitespace-nowrap">
                  {i > 0 && (
                    <span aria-hidden="true" className="px-1.5 text-venice/45">
                      /
                    </span>
                  )}
                  {i > 0 && <span className="sr-only">, </span>}
                  {item}
                </span>
              </Fragment>
            ))}
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
            <LiveButton href={build.live} name={build.name} />
            <a
              href={build.github}
              target="_blank"
              rel="noopener noreferrer"
              className="group/src inline-flex min-h-12 items-center gap-2.5 text-[0.95rem] font-semibold text-ink transition-[scale] duration-150 ease-out active:scale-[0.97]"
            >
              <Icon name="github" size={18} mono />
              <span className="relative before:absolute before:inset-x-0 before:-bottom-1 before:h-px before:bg-ink/20 after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-right after:scale-x-0 after:bg-ink after:transition-transform after:duration-300 after:ease-out group-hover/src:after:origin-left group-hover/src:after:scale-x-100 group-focus-visible/src:after:origin-left group-focus-visible/src:after:scale-x-100">
                Under the hood
              </span>
              <span className="sr-only">: {build.name} source code on GitHub (opens in a new tab)</span>
            </a>
          </div>
          {build.note ? <p className="mt-4 max-w-[48ch] text-[0.875rem] leading-snug text-ink/75">{build.note}</p> : null}
          {build.warm ? <WarmUp url={build.warm} /> : null}
        </div>
      </div>

      {/* the screens, full width, whole and uncropped */}
      <div className="mt-[clamp(2.5rem,6vw,4.5rem)]">
        <BuildFigure build={build} />
      </div>
    </article>
  );
}
