/**
 * When Stages pins its frame and drives the road band (wide and tall enough for the sheet, motion allowed).
 * RouteLegs reads the same query, so the page route joins the band only when the band is there.
 */
export const STAGES_TRACK_QUERY = [
  "(min-width: 1024px) and (min-height: 700px) and (min-aspect-ratio: 1/1) and (prefers-reduced-motion: no-preference)",
].join(", ");
