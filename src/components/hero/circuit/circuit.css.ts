/**
 * Component-scoped styles for the circuit map (hoisted once by React 19's <style href precedence>).
 * SVG stroke widths are user units; `--u` (set from the map's rendered width) is "one screen pixel in user
 * units", so hairlines and type stay the same on screen whether the map is 360 or 760 pixels wide.
 */
export const CIRCUIT_CSS = `
.cm { position: relative; container: circuit / inline-size; --u: 1.35; }
.cm-sheet { position: relative; aspect-ratio: 1000 / 840; -webkit-tap-highlight-color: transparent; }
.cm-svg { position: absolute; inset: 0; width: 100%; height: 100%; display: block; overflow: visible; }

/* ink and paper */
.cm-ink-fill { fill: var(--color-ink); }
.cm-paper-fill { fill: var(--color-paper); }
.cm-hair { fill: none; stroke: color-mix(in srgb, var(--color-ink) 42%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cm-hair-solid { fill: none; stroke: var(--color-ink); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cm-compass .cm-paper-fill, .cm-scale .cm-paper-fill { stroke: var(--color-ink); stroke-width: 1; vector-effect: non-scaling-stroke; }

/* the track */
.cm-trk-edge, .cm-trk-lift, .cm-trk-surface { fill: none; stroke-linejoin: round; }
.cm-trk-edge { stroke: var(--color-ink); stroke-width: calc(40px + 2.5px * var(--u)); }
.cm-trk-lift {
  stroke: var(--color-ink);
  stroke-width: calc(40px + 2.5px * var(--u));
  stroke-linecap: butt;
  transition: stroke-width 520ms var(--ease-out), opacity 400ms var(--ease-out);
}
.cm-trk-lift[data-on="true"] { stroke-width: calc(40px + 5.5px * var(--u)); }
.cm-trk-surface { stroke: var(--color-paper-deep); stroke-width: 40px; }

.cm-runoff { fill: url(#cm-hatch); stroke: color-mix(in srgb, var(--color-rock) 75%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cm-hatch-line { stroke: var(--color-rock-soft); stroke-width: 2.6; }
.cm-kerb-base, .cm-kerb { fill: none; stroke-width: 5; stroke-linecap: butt; }
.cm-kerb-base { stroke: var(--color-paper); }
.cm-kerb { stroke: var(--color-ink); stroke-dasharray: 5 5; }

.cm-pit-edge, .cm-pit-surface { fill: none; stroke-linejoin: round; stroke-linecap: round; }
.cm-pit-edge { stroke: var(--color-ink); stroke-width: calc(10px + 2px * var(--u)); }
.cm-pit-surface { stroke: var(--color-paper-deep); stroke-width: 10px; }
.cm-pit-t { font-family: var(--font-sans); font-weight: 700; font-size: calc(8.5px * var(--u)); letter-spacing: 0.16em; fill: var(--color-ink); }

.cm-race-dots { fill: none; stroke: var(--color-ink); stroke-opacity: 0.4; stroke-width: calc(1.5px * var(--u)); stroke-linecap: round; stroke-dasharray: 0.1 calc(5.5px * var(--u)); }
.cm-race-on {
  fill: none;
  stroke: var(--color-route);
  stroke-width: calc(2.4px * var(--u));
  stroke-linecap: butt;
  opacity: 0;
  transition: opacity 420ms var(--ease-out);
}
.cm-race-on[data-on="true"] { opacity: 1; }

.cm-grid { fill: none; stroke: color-mix(in srgb, var(--color-ink) 50%, transparent); stroke-width: calc(1.2px * var(--u)); stroke-linejoin: round; }
.cm-tick { fill: none; stroke: var(--color-ink); stroke-width: 1.25; vector-effect: non-scaling-stroke; }

.cm-turns text { font-family: var(--font-sans); font-weight: 700; font-size: calc(9.5px * var(--u)); fill: color-mix(in srgb, var(--color-ink) 50%, transparent); }

.cm-badges { display: none; }
.cm-badges circle { r: calc(10px * var(--u)); fill: var(--color-paper); stroke: color-mix(in srgb, var(--color-ink) 45%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; transition: fill 300ms var(--ease-out), stroke 300ms var(--ease-out); }
.cm-badges text { font-family: var(--font-sans); font-weight: 700; font-size: calc(10.5px * var(--u)); fill: var(--color-ink); }
.cm-badges [data-on="true"] circle { fill: var(--color-route); stroke: var(--color-route); }
.cm-badges [data-on="true"] text { fill: var(--color-night); }

.cm-compass-n { font-family: var(--font-sans); font-weight: 700; font-size: calc(10px * var(--u)); fill: var(--color-ink); }
.cm-scale-t { font-family: var(--font-mono); font-size: calc(8.5px * var(--u)); letter-spacing: 0.06em; fill: color-mix(in srgb, var(--color-ink) 75%, transparent); }

.cm-leader line { stroke: color-mix(in srgb, var(--color-ink) 55%, transparent); stroke-width: 1; vector-effect: non-scaling-stroke; }
.cm-leader circle { fill: var(--color-route); stroke: var(--color-paper); stroke-width: 1.5; vector-effect: non-scaling-stroke; }

/* the car (it moves above the sheet, so it may cast a shadow) */
.cm-car-body { fill: var(--color-ink); }
.cm-car-tyre { fill: var(--color-ink); opacity: 0.55; }
.cm-car-glass { fill: var(--color-rock-soft); }
.cm-car-stripe { fill: var(--color-route); }
.cm-car-tail { fill: var(--color-route-deep); opacity: 0.55; transition: opacity 160ms ease, fill 160ms ease; }
.cm-car[data-brake="true"] .cm-car-tail { fill: var(--color-route); opacity: 1; }

/* while the loader is up, the cue waits for lights out */
.cm[data-intro="armed"] .cm-trk-lift,
.cm[data-intro="armed"] .cm-race-on,
.cm[data-intro="armed"] .cm-leader { opacity: 0 !important; }

/* map title */
.cm-title { margin: 0 0 10px; }
.cm-title-h { font-family: var(--font-sans); font-weight: 650; font-size: clamp(0.95rem, 1.9cqi, 1.1rem); line-height: 1.15; letter-spacing: -0.01em; color: var(--color-ink); }
.cm-title-p { margin-top: 3px; font-size: clamp(0.8rem, 1.55cqi, 0.9rem); line-height: 1.35; color: color-mix(in srgb, var(--color-ink) 72%, transparent); }
.cm-hint-coarse { display: none; }
@media (hover: none), (pointer: coarse) {
  .cm-hint-fine { display: none; }
  .cm-hint-coarse { display: inline; }
}

/* sector labels */
.cm-labels { position: absolute; inset: 0; margin: 0; padding: 0; list-style: none; pointer-events: none; }
.cm-label-li { position: absolute; transform: translate(-50%, -50%); pointer-events: auto; }
.cm-label-li[data-align="left"] { transform: translate(-6px, -50%); }
.cm-label-li[data-align="right"] { transform: translate(calc(-100% + 6px), -50%); }
.cm-label {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  padding: 5px 6px;
  border-radius: 4px;
  font-family: var(--font-sans);
  font-weight: 600;
  font-size: clamp(11.5px, 1.8cqi, 14px);
  line-height: 1;
  letter-spacing: -0.005em;
  white-space: nowrap;
  color: color-mix(in srgb, var(--color-ink) 66%, transparent);
  background: color-mix(in srgb, var(--color-paper) 86%, transparent);
  transition: color 300ms var(--ease-out), transform 160ms var(--ease-out);
  user-select: none;
}
.cm-label:hover { color: var(--color-ink); }
.cm-label:active { transform: scale(0.97); }
.cm-label[data-on="true"] { color: var(--color-ink); }
.cm-num {
  display: inline-grid;
  place-items: center;
  width: 1.75em;
  height: 1.75em;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--color-ink) 38%, transparent);
  font-size: 0.8em;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  transition: background-color 300ms var(--ease-out), border-color 300ms var(--ease-out), color 300ms var(--ease-out);
}
.cm-label[data-on="true"] .cm-num { background: var(--color-route); border-color: var(--color-route); color: var(--color-night); }

.cm-key { display: none; margin: 12px 0 0; padding: 0; list-style: none; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 8px; }
.cm-key .cm-label { width: 100%; padding: 7px 4px; font-size: 14px; background: none; }

/* the timing panel */
.cm-panel { position: relative; margin-top: 14px; padding: 14px 16px 16px; border: 1px solid var(--color-paper-line); border-radius: 3px; background: var(--color-paper); }
.cm-pips { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 4px; margin-bottom: 12px; }
.cm-pip { height: 3px; border-radius: 3px; background: var(--color-paper-line); transition: background-color 240ms var(--ease-out); }
.cm-pip[data-state="done"] { background: color-mix(in srgb, var(--color-ink) 55%, transparent); }
.cm-pip[data-state="active"] { background: var(--color-route); }
.cm-pip[data-state="light"] { background: var(--color-ink); transition-duration: 60ms; }
.cm-cards { display: grid; }
.cm-card {
  grid-area: 1 / 1;
  opacity: 0;
  visibility: hidden;
  transform: translateY(4px);
  transition: opacity 180ms var(--ease-out), transform 180ms var(--ease-out), visibility 0s linear 180ms;
}
.cm-card[data-on="true"] {
  opacity: 1;
  visibility: visible;
  transform: none;
  transition: opacity 320ms var(--ease-out) 90ms, transform 460ms var(--ease-out) 90ms, visibility 0s;
}
.cm-kicker { font-family: var(--font-sans); font-weight: 600; font-size: 11px; line-height: 1; letter-spacing: 0.14em; text-transform: uppercase; color: color-mix(in srgb, var(--color-ink) 76%, transparent); }
.cm-name { margin-top: 8px; font-family: var(--font-display); font-weight: 680; font-size: clamp(0.98rem, 2cqi, 1.18rem); line-height: 1.08; letter-spacing: -0.025em; color: var(--color-ink); text-wrap: balance; }
.cm-proof { margin-top: 8px; font-size: clamp(12.5px, 1.85cqi, 14.5px); line-height: 1.45; color: color-mix(in srgb, var(--color-ink) 86%, transparent); }
.cm-where { margin-top: 8px; font-size: clamp(12px, 1.7cqi, 13.5px); font-weight: 600; line-height: 1.3; color: var(--color-venice); }
.cm-tools { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0; padding: 0; list-style: none; }
.cm-tools li { padding: 4px 6px; border: 1px solid var(--color-paper-line); border-radius: 3px; font-size: 11.5px; line-height: 1; color: color-mix(in srgb, var(--color-ink) 82%, transparent); }

@container circuit (min-width: 560px) {
  .cm-title { position: absolute; z-index: 1; top: 0.6%; left: 1%; max-width: 44%; margin: 0; }
}
@container circuit (min-width: 640px) {
  .cm-panel { position: absolute; margin: 0; left: 52%; top: 30.5%; width: 28.5%; padding: clamp(12px, 1.8cqi, 16px); }
}
@container circuit (max-width: 559px) {
  .cm-labels, .cm-turns, .cm-scale, .cm-detail { display: none; }
  .cm-badges { display: inline; }
  .cm-key { display: grid; }
}
@media (prefers-reduced-motion: reduce) {
  .cm-card, .cm-card[data-on="true"] { transform: none; }
}
`;
