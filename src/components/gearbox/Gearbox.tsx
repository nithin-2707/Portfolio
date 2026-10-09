import { gears } from "@/content/site";
import { Shifter } from "./Shifter";

/**
 * Gearbox (paper, ink print). The skill groups are the six gears of an H-pattern shifter: the plate
 * and its knob sit left, the read-out of the engaged gear sits right (stacked below the plate on
 * small screens). Rock Blue lives only in the plate: its neatline and the contours of the summit
 * the gate is cut into.
 */
export function Gearbox() {
  return (
    <section
      id="gearbox"
      aria-labelledby="gearbox-title"
      data-waypoint="gearbox"
      className="relative overflow-hidden bg-paper py-[var(--section-y)] text-ink"
    >
      <div className="mx-auto grid max-w-[var(--container-route)] gap-y-14 px-[var(--gutter)] lg:grid-cols-12 lg:gap-x-6 lg:gap-y-16">
        <header className="lg:col-span-5 lg:row-start-1">
          <h2 id="gearbox-title" className="t-heading text-ink">
            Gearbox
          </h2>
          <p className="mt-4 max-w-[28ch] text-[clamp(1.125rem,1.6vw,1.375rem)] leading-snug text-ink/80">Shift through what I work with.</p>
        </header>
        <Shifter />
        {/* every gear's parts, server-rendered for search engines and screen readers (the shifter shows one at a time) */}
        <div className="sr-only">
          <h3>Full parts list</h3>
          {gears.map((g) => (
            <p key={g.gear}>
              Gear {g.gear}, {g.name}: {g.items.map((i) => i.name).join(", ")}.
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
