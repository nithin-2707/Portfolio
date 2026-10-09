import { SideRoadList } from "./SideRoadList";
import { SideRoadsHeader } from "./SideRoadsHeader";

/**
 * Side roads: night. Two smaller builds as big editorial rows, source only.
 * The header is a branch peeling off the main route; each row carries its own junction tulip.
 * The screenshot is something you discover by moving over a row, not a grid of cards.
 * overflow-x: clip keeps the full-bleed route line from widening the page (it never clips vertically).
 */
export function SideRoads() {
  return (
    <section
      id="side-roads"
      aria-labelledby="side-roads-title"
      data-waypoint="side-roads"
      data-nav-tone="dark"
      className="relative overflow-x-clip bg-night text-paper"
    >
      <div className="mx-auto max-w-[var(--container-route)] px-[var(--gutter)] py-[var(--section-y)]">
        <SideRoadsHeader />
        <div className="mt-[clamp(2.75rem,6vw,4.5rem)]">
          <SideRoadList />
        </div>
      </div>
    </section>
  );
}
