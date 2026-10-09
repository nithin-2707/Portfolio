/**
 * The printed furniture of the circuit map, derived once from the geometry: gravel traps, kerbs, the pit lane,
 * the grid, the start/finish chequer, sector ticks, turn numbers and the sector windows (dash windows on the
 * shared track and racing-line paths, so a cued stretch is just the same path with a different dash).
 */

import {
  CX,
  CY,
  DS,
  HW,
  N,
  NX,
  NY,
  RCUM,
  RLAP,
  SECTOR_START,
  TURNS,
  TX,
  TY,
  offsetD,
  offsetPt,
  sectorEnd,
} from "./geometry";

const r1 = (n: number) => Math.round(n * 10) / 10;
const wrap = (i: number) => ((i % N) + N) % N;
const u = (units: number) => Math.max(1, Math.round(units / DS));

/* ── gravel traps: hatched run-off on the outside of the big corners, widest just after the apex ── */

const RUNOFF_AT: { turn: number; before: number; after: number; width: number }[] = [
  { turn: 0, before: 70, after: 120, width: 42 }, // T1
  { turn: 3, before: 90, after: 120, width: 30 }, // T4, the sweeper
  { turn: 5, before: 60, after: 110, width: 46 }, // T6, hairpin
  { turn: 6, before: 40, after: 90, width: 34 }, // T7
  { turn: 8, before: 70, after: 120, width: 40 }, // T9, final corner
];

export const RUNOFF: string[] = RUNOFF_AT.map(({ turn, before, after, width }) => {
  const t = TURNS[turn];
  const out = -t.dir; // the outside of the corner
  const a = t.i - u(before);
  const b = t.i + u(after);
  const span = b - a;
  const inner = HW + 5;
  const w = (i: number) => {
    const k = wrap(i - a) / span;
    // a lopsided bump: the trap grows into the corner and is deepest past the apex, where cars run wide
    const skew = Math.pow(k, 0.8);
    return width * Math.pow(Math.sin(Math.PI * skew), 1.4);
  };
  let d = offsetD(a, b, () => out * inner, 2);
  // back along the outer boundary
  for (let k = span; k >= 0; k -= 2) {
    const i = wrap(a + k);
    const o = out * (inner + w(i));
    d += ` ${r1(CX[i] + NX[i] * o)} ${r1(CY[i] + NY[i] * o)}`;
  }
  return `${d}Z`;
});

/* ── kerbs: striped, on the inside at each apex, and on the outside where a car runs out of road on exit ── */

export const KERBS: string[] = [
  ...TURNS.map((t, k) => {
    const half = k === 5 ? 46 : k === 3 ? 52 : 30;
    return offsetD(t.i - u(half), t.i + u(half), () => t.dir * (HW + 3.4), 1);
  }),
  // exit kerbs on the outside of T1, the hairpin and the final corner
  ...[0, 5, 8].map((turn) => {
    const t = TURNS[turn];
    return offsetD(t.i + u(30), t.i + u(84), () => -t.dir * (HW + 3.4), 1);
  }),
];

/* ── pit lane: leaves after the final corner, runs inside the main straight, rejoins before T1 ── */

const PIT_IN = N - u(118);
const PIT_FULL_IN = N - u(70);
const PIT_FULL_OUT = u(170);
const PIT_OUT = u(232);
const PIT_OFF = HW + 17;
const smooth = (x: number) => x * x * (3 - 2 * x);
function pitOffset(i: number) {
  const s = wrap(i - PIT_IN);
  const inRamp = wrap(PIT_FULL_IN - PIT_IN);
  const total = wrap(PIT_OUT - PIT_IN);
  const outRamp = wrap(PIT_OUT - PIT_FULL_OUT);
  if (s < inRamp) return (HW - 2) + (PIT_OFF - HW + 2) * smooth(s / inRamp);
  if (s > total - outRamp) return (HW - 2) + (PIT_OFF - HW + 2) * smooth((total - s) / outRamp);
  return PIT_OFF;
}
export const PIT_D = offsetD(PIT_IN, PIT_OUT, pitOffset, 2);
/** Pit boxes: short ticks on the infield side of the pit lane. */
export const PIT_BOXES: string = (() => {
  let d = "";
  for (let s = -u(36); s <= u(130); s += u(20)) {
    const a = offsetPt(s, PIT_OFF + 6);
    const b = offsetPt(s, PIT_OFF + 15);
    d += `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;
  }
  return d;
})();
export const PIT_LABEL = (() => {
  const p = offsetPt(u(42), PIT_OFF + 25);
  return { x: r1(p[0]), y: r1(p[1]) };
})();

/* ── start / finish: the chequered band at sample 0, and the grid slots behind it ── */

const sfAngle = (Math.atan2(TY[0], TX[0]) * 180) / Math.PI;
export const SF = { x: r1(CX[0]), y: r1(CY[0]), angle: r1(sfAngle), w: 10, h: HW * 2 };

/** Grid slots: staggered transverse marks behind the line, alternating sides. The pole slot is the first. */
export const GRID_SLOTS = [0, 1, 2, 3].map((k) => {
  const i = wrap(-u(30 + k * 26));
  const side = k % 2 === 0 ? 1 : -1;
  return { i, side, off: side * HW * 0.42 };
});
export const GRID_D: string = GRID_SLOTS.map(({ i, side }) => {
  const a = offsetPt(i, side * (HW - 3));
  const b = offsetPt(i, side * 3);
  const c = offsetPt(i - u(12), side * (HW - 3));
  return `M${r1(c[0])} ${r1(c[1])}L${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;
}).join("");

/* ── sector boundaries (S1 starts at the chequer, so it gets no tick) ── */

export const SECTOR_TICKS: string = SECTOR_START.slice(1)
  .map((i) => {
    const a = offsetPt(i, HW + 9);
    const b = offsetPt(i, -HW - 9);
    return `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}`;
  })
  .join("");

/* ── turn numbers, printed on the outside of each apex ── */

const TURN_NUDGE: Record<number, [number, number]> = {
  4: [4, 2],
};
/** Turns whose number goes on the inside of the corner (their outside faces the timing panel). */
const TURN_INSIDE = new Set([1, 6]);
export const TURN_LABELS = TURNS.map((t, k) => {
  const trap = RUNOFF_AT.find((r) => r.turn === k);
  const inside = TURN_INSIDE.has(k);
  const off = inside ? HW + 17 : trap ? HW + 5 + trap.width * 0.95 + 13 : HW + 19;
  const p = offsetPt(t.i + (trap && !inside ? u(18) : 0), (inside ? t.dir : -t.dir) * off);
  const [dx, dy] = TURN_NUDGE[k] ?? [0, 0];
  return { n: k + 1, x: r1(p[0] + dx), y: r1(p[1] + dy) };
});

/* ── sector windows on the shared paths (pathLength = 1) ── */

const f4 = (n: number) => Math.round(n * 10000) / 10000;
export const TRACK_WINDOWS = SECTOR_START.map((a, k) => {
  const from = a / N;
  const to = sectorEnd(k) / N;
  return { dash: `${f4(to - from)} ${f4(1 - (to - from))}`, offset: f4(-from) };
});
export const RACE_WINDOWS = SECTOR_START.map((a, k) => {
  const from = RCUM[a] / RLAP;
  const to = RCUM[sectorEnd(k)] / RLAP;
  return { from: f4(from), len: f4(to - from) };
});

/* ── where each sector's label sits (outside the loop, beside its stretch) ── */

export type LabelSpot = { x: number; y: number; align: "left" | "right" | "center"; place: "above" | "below" | "middle" };
export const LABEL_SPOTS: LabelSpot[] = [
  { x: 640, y: 806, align: "center", place: "middle" }, // S1: under the main straight, towards T1
  { x: 858, y: 194, align: "right", place: "middle" }, // S2: inside the long sweeper
  { x: 500, y: 194, align: "center", place: "middle" }, // S3: under the back straight
  { x: 112, y: 352, align: "left", place: "middle" }, // S4: under the hairpin
  { x: 238, y: 548, align: "right", place: "middle" }, // S5: beside the fast esses
];

/** Small numbered badges for compact maps: on the stretch's outer side. */
export const BADGE_SPOTS = SECTOR_START.map((a, k) => {
  const mid = Math.round((a + sectorEnd(k)) / 2);
  const p = offsetPt(mid, -(HW + 46));
  return { x: r1(p[0]), y: r1(p[1]) };
});

