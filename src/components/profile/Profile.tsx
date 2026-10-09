import { bio } from "@/content/site";
import ScrollReveal from "./ScrollReveal";
import { Roadbook } from "./Roadbook";
import { RoadSigns } from "./RoadSigns";
import { contourTexture } from "@/lib/contourTexture";

/**
 * The atlas sheet under the spread: contours anchored in the top-right corner, where the page is empty
 * (above the roadbook), fading out before the bio column. Lines are 1px Rock Blue (<= 0.6 alpha in the asset,
 * <= 0.7 layer opacity), so even where a faded line passes under roadbook text every text colour stays AA.
 */
const CONTOUR_MASK =
  "radial-gradient(ellipse 140% 75% at 100% 0%, #000 0%, #000 24%, rgb(0 0 0 / 0.45) 46%, transparent 76%)";
/** The section above is paper too: the sheet eases in from the section edge instead of starting on a seam. */
const TOP_FADE = "linear-gradient(to bottom, transparent, #000 clamp(3rem, 7vw, 6rem))";
/** Phones: the bio spans the full width, so the sheet keeps to the top padding and the coordinate corner. */
const CONTOUR_MASK_SM = "radial-gradient(ellipse 100% 45% at 100% 0%, #000 0%, rgb(0 0 0 / 0.4) 25%, transparent 55%)";

/**
 * Profile: paper. An asymmetric 7/5 spread. The heading is set small and quiet; the bio carries the weight as
 * editorial display text that inks in word by word with scroll (and stays in view on wide screens while the
 * roadbook passes); the right column is a printed rally roadbook, from the start control to the road ahead.
 * Under the spread, the three-word beat stands at the roadside as three road signs.
 */
export function Profile() {
  return (
    <section id="profile" aria-labelledby="profile-title" data-waypoint="profile" className="relative bg-paper text-ink">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-full lg:w-[min(64rem,72%)]"
        style={{ maskImage: TOP_FADE, WebkitMaskImage: TOP_FADE }}
      >
        <div
          className="size-full opacity-60 [-webkit-mask-image:var(--contour-mask-sm)] [mask-image:var(--contour-mask-sm)] lg:opacity-70 lg:[-webkit-mask-image:var(--contour-mask)] lg:[mask-image:var(--contour-mask)]"
          style={{ ["--contour-mask" as string]: CONTOUR_MASK, ["--contour-mask-sm" as string]: CONTOUR_MASK_SM }}
        >
          <div className="size-full bg-rock" style={contourTexture("cover", "right top")} />
        </div>
      </div>

      <div className="relative mx-auto max-w-[var(--container-route)] px-[var(--gutter)] py-[var(--section-y)]">
        <div className="grid gap-y-[clamp(3.5rem,8vw,5rem)] lg:grid-cols-12 lg:gap-x-[clamp(2.5rem,5vw,5.5rem)]">
          <div className="lg:col-span-7">
            <div className="lg:sticky lg:top-[clamp(6rem,14vh,9rem)]">
              <h2
                id="profile-title"
                className="font-display text-[clamp(1.5rem,2.4vw,2rem)] font-semibold leading-none tracking-[-0.02em] text-venice"
              >
                Profile
              </h2>
              <ScrollReveal
                className="mt-[clamp(1.75rem,3.5vw,2.75rem)] max-w-[30ch] text-[clamp(1.5rem,3vw,2.6rem)] font-medium leading-[1.25] tracking-[-0.015em] text-ink"
                baseOpacity={0.32}
                blurStrength={0}
                start="top 85%"
                end="bottom 75%"
              >
                {bio}
              </ScrollReveal>
            </div>
          </div>
          <div className="lg:col-span-5 lg:pt-[clamp(5rem,10vw,9.5rem)]">
            <h3 className="mb-4 text-[0.875rem] font-medium text-venice">Roadbook · read top to bottom</h3>
            <Roadbook />
          </div>
        </div>

        <div className="mt-[clamp(5rem,12vw,9rem)]">
          <RoadSigns />
        </div>
      </div>
    </section>
  );
}
