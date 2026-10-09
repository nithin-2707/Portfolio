/**
 * The site colours as JS values, for the places CSS cannot reach: canvas drawing and WebGL uniforms.
 * Everything else reads the same tokens straight from CSS (`--color-*` in globals.css), so this module
 * only mirrors them. `readColors()` resolves the live values on <html>, so a palette override set on the
 * root element reaches the canvases too.
 */

export const DEFAULT_COLORS = {
  paper: "#f5eedd",
  paperDeep: "#ece2c9",
  paperLine: "#d9cdb0",
  ink: "#0e2f44",
  venice: "#16587b",
  veniceDeep: "#0f4361",
  rock: "#84b3ce",
  rockSoft: "#c3dbe7",
  route: "#e8642c",
  routeDeep: "#c24e1c",
  night: "#0c2738",
  night2: "#123548",
  nightLine: "#24506a",
  water: "#a7c6d6",
  shade: "#ddd9cb",
};

export type SiteColors = Record<keyof typeof DEFAULT_COLORS, string>;

const VAR: Record<keyof SiteColors, string> = {
  paper: "--color-paper",
  paperDeep: "--color-paper-deep",
  paperLine: "--color-paper-line",
  ink: "--color-ink",
  venice: "--color-venice",
  veniceDeep: "--color-venice-deep",
  rock: "--color-rock",
  rockSoft: "--color-rock-soft",
  route: "--color-route",
  routeDeep: "--color-route-deep",
  night: "--color-night",
  night2: "--color-night-2",
  nightLine: "--color-night-line",
  water: "--color-water",
  shade: "--color-shade",
};

/** Live token values from <html> (hex), falling back to the defaults on the server or if a token is missing. */
export function readColors(): SiteColors {
  if (typeof document === "undefined") return { ...DEFAULT_COLORS };
  const style = getComputedStyle(document.documentElement);
  const out = { ...DEFAULT_COLORS };
  for (const key of Object.keys(VAR) as (keyof SiteColors)[]) {
    const v = style.getPropertyValue(VAR[key]).trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) out[key] = v;
    // the CSS minifier may shorten #aabbcc to #abc
    else if (/^#[0-9a-f]{3}$/i.test(v)) out[key] = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  }
  return out;
}

/** `#rrggbb` + alpha -> `rgba(r, g, b, a)`, for canvas strokes and fills. */
export function rgba(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
