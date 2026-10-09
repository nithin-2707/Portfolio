/**
 * H-pattern gate geometry, in the SVG viewBox's own units. Everything that moves the knob
 * (click, keys, drag, the teaching shift) routes through these functions, so the knob can only
 * ever be on the gate: up and down the three slots, or along the neutral channel.
 *
 *     1     3     5
 *     |     |     |
 *     +-----N-----+      <- neutral channel
 *     |     |     |
 *     2     4     6
 */

export type Pt = { x: number; y: number };

export const VB = { w: 360, h: 420 } as const;
export const SLOT_X = [72, 180, 288] as const;
export const Y_TOP = 116;
export const Y_BOT = 304;
export const Y_N = 210;
/** Within this distance of the channel the lever is out of gear (neutral detent). */
export const NEUTRAL_ZONE = 30;

/** Where the lever rests in neutral: centre of the channel, like a sprung real gearbox. */
export const NEUTRAL: Pt = { x: SLOT_X[1], y: Y_N };

export const GEAR_COUNT = 6;

/** Slot end for gear 1..6 (odd gears at the top, even at the bottom). */
export function gearPoint(gear: number): Pt {
  const slot = Math.floor((gear - 1) / 2);
  return { x: SLOT_X[slot], y: gear % 2 === 1 ? Y_TOP : Y_BOT };
}

export function pointFor(gear: number | null): Pt {
  return gear === null ? NEUTRAL : gearPoint(gear);
}

const EPS = 0.5;

function onChannel(p: Pt) {
  return Math.abs(p.y - Y_N) < EPS;
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Closest point on the gate to p (three slots plus the channel). */
export function nearestOnGate(p: Pt): Pt {
  let best: Pt = { x: clamp(p.x, SLOT_X[0], SLOT_X[2]), y: Y_N };
  let bestD = (best.x - p.x) ** 2 + (best.y - p.y) ** 2;
  for (const x of SLOT_X) {
    const q = { x, y: clamp(p.y, Y_TOP, Y_BOT) };
    const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
    if (d < bestD) {
      best = q;
      bestD = d;
    }
  }
  return best;
}

/**
 * The path a lever really takes between two points on the gate: out of its slot to the
 * channel, along the channel, then into the target slot. A move within one slot is straight.
 */
export function route(from: Pt, to: Pt): Pt[] {
  const pts: Pt[] = [from];
  const sameLine = Math.abs(from.x - to.x) < EPS && !onChannel(from) && !onChannel(to);
  if (!sameLine) {
    if (!onChannel(from)) pts.push({ x: from.x, y: Y_N });
    if (!onChannel(to)) pts.push({ x: to.x, y: Y_N });
  }
  pts.push(to);
  // drop zero-length hops
  return pts.filter((p, i) => i === 0 || Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) > 0.01);
}

export function pathLength(pts: Pt[]): number {
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  return len;
}

/** Point at arc-length distance d along the polyline (clamped to its ends). */
export function pointAt(pts: Pt[], d: number): Pt {
  if (pts.length === 1 || d <= 0) return { ...pts[0] };
  let left = d;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (left <= seg) {
      const t = seg === 0 ? 0 : left / seg;
      return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    }
    left -= seg;
  }
  return { ...pts[pts.length - 1] };
}

/** SVG path data for a polyline. */
export function toPath(pts: Pt[]): string {
  return pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
}

/** Which gear a resting lever position means: null when it sits in the neutral detent. */
export function gearAt(p: Pt): number | null {
  if (Math.abs(p.y - Y_N) <= NEUTRAL_ZONE) return null;
  let slot = 0;
  for (let i = 1; i < SLOT_X.length; i++) if (Math.abs(SLOT_X[i] - p.x) < Math.abs(SLOT_X[slot] - p.x)) slot = i;
  return slot * 2 + (p.y < Y_N ? 1 : 2);
}

/** The number the knob shows while travelling: "N" in the channel, else the slot end it is heading into. */
export function knobLabel(p: Pt): string {
  const g = gearAt(p);
  return g === null ? "N" : String(g);
}

/** The gate itself: three slots and the channel, as one path. */
export const GATE_PATH = [
  ...SLOT_X.map((x) => `M ${x} ${Y_TOP} V ${Y_BOT}`),
  `M ${SLOT_X[0]} ${Y_N} H ${SLOT_X[2]}`,
].join(" ");
