/**
 * The circuit, as pure geometry. Everything here is computed once at module load (server and client get the
 * same numbers), so the map is in the server HTML and the car has a dense, arc-length table to drive on.
 *
 * Coordinates are SVG user units in a VBW x VBH sheet, y down. The lap runs anticlockwise on screen: the main
 * straight along the bottom (left to right), the esses and a long sweeper up the right, the back straight
 * along the top, a hairpin at the top left, then fast esses down through the middle and the final corner.
 * Sample 0 is the start/finish line, so every "fraction of the lap" also starts there.
 */

export const VBW = 1000;
export const VBH = 840;
/** Track half-width. */
export const HW = 20;

type P = readonly [number, number];

/* Control points of the centreline (centripetal Catmull-Rom through them). The first one is the S/F line. */
const CTRL: readonly P[] = [
  [452, 760], // start / finish
  [640, 756],
  [770, 748], // brake for T1
  [840, 732],
  [874, 694], // T1, left
  [880, 640],
  [870, 590],
  [848, 548], // T2, the kink right
  [852, 500],
  [882, 454], // T3, left
  [912, 380],
  [922, 292], // T4, the long sweeper
  [904, 202],
  [858, 134],
  [788, 96],
  [700, 96],
  [580, 116], // back straight, climbing to the right
  [440, 140],
  [320, 160],
  [228, 176], // brake for the hairpin
  [164, 194],
  [130, 230], // T6, hairpin
  [146, 268],
  [204, 284],
  [300, 288],
  [392, 294],
  [446, 322], // T7, right
  [466, 378],
  [444, 444], // T8, left
  [380, 504],
  [306, 562],
  [256, 620], // T9
  [238, 678],
  [256, 730], // T10, final corner
  [310, 758],
];

/* ── small math ─────────────────────────────────────────────── */

const r1 = (n: number) => (Math.round(n * 10) / 10).toString();
const wrap = (i: number, n: number) => ((i % n) + n) % n;
const angDiff = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** Closed centripetal Catmull-Rom (alpha 0.5) as cubic Bezier segments: [p1, c1, c2, p2]. */
function catmullRom(points: readonly P[], alpha = 0.5): [P, P, P, P][] {
  const n = points.length;
  const segs: [P, P, P, P][] = [];
  for (let i = 0; i < n; i++) {
    const p0 = points[wrap(i - 1, n)];
    const p1 = points[i];
    const p2 = points[wrap(i + 1, n)];
    const p3 = points[wrap(i + 2, n)];
    const l01 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const l12 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const l23 = Math.hypot(p3[0] - p2[0], p3[1] - p2[1]);
    const a01 = Math.pow(l01, alpha);
    const a12 = Math.pow(l12, alpha);
    const a23 = Math.pow(l23, alpha);
    const a01s = a01 * a01;
    const a12s = a12 * a12;
    const a23s = a23 * a23;
    const A = 2 * a01s + 3 * a01 * a12 + a12s;
    const N = 3 * a01 * (a01 + a12);
    const B = 2 * a23s + 3 * a23 * a12 + a12s;
    const M = 3 * a23 * (a23 + a12);
    const c1: P = [(p1[0] * A - p0[0] * a12s + p2[0] * a01s) / N, (p1[1] * A - p0[1] * a12s + p2[1] * a01s) / N];
    const c2: P = [(p2[0] * B + p1[0] * a23s - p3[0] * a12s) / M, (p2[1] * B + p1[1] * a23s - p3[1] * a12s) / M];
    segs.push([p1, c1, c2, p2]);
  }
  return segs;
}

function bez(s: [P, P, P, P], t: number): P {
  const u = 1 - t;
  const a = u * u * u;
  const b = 3 * u * u * t;
  const c = 3 * u * t * t;
  const d = t * t * t;
  return [a * s[0][0] + b * s[1][0] + c * s[2][0] + d * s[3][0], a * s[0][1] + b * s[1][1] + c * s[2][1] + d * s[3][1]];
}

function bezierD(segs: [P, P, P, P][]): string {
  let d = `M${r1(segs[0][0][0])} ${r1(segs[0][0][1])}`;
  for (const s of segs) d += `C${r1(s[1][0])} ${r1(s[1][1])} ${r1(s[2][0])} ${r1(s[2][1])} ${r1(s[3][0])} ${r1(s[3][1])}`;
  return `${d}Z`;
}

/** Resample a closed dense polyline at `n` points evenly spaced by arc length. */
function resample(dense: P[], n: number) {
  const m = dense.length;
  const cum = new Float64Array(m + 1);
  for (let i = 1; i <= m; i++) {
    const a = dense[i - 1];
    const b = dense[i % m];
    cum[i] = cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  const total = cum[m];
  const xs = new Float64Array(n);
  const ys = new Float64Array(n);
  let j = 0;
  for (let i = 0; i < n; i++) {
    const s = (i / n) * total;
    while (cum[j + 1] < s) j++;
    const t = (s - cum[j]) / (cum[j + 1] - cum[j] || 1);
    const a = dense[j];
    const b = dense[(j + 1) % m];
    xs[i] = a[0] + (b[0] - a[0]) * t;
    ys[i] = a[1] + (b[1] - a[1]) * t;
  }
  return { xs, ys, total };
}

/** Circular Gaussian blur of a per-sample signal, sigma in samples. */
function blur(src: Float64Array, sigma: number) {
  const n = src.length;
  const out = new Float64Array(n);
  const rad = Math.ceil(sigma * 3);
  const k: number[] = [];
  let sum = 0;
  for (let i = -rad; i <= rad; i++) {
    const w = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(w);
    sum += w;
  }
  for (let i = 0; i < n; i++) {
    let acc = 0;
    for (let j = -rad; j <= rad; j++) acc += src[wrap(i + j, n)] * k[j + rad];
    out[i] = acc / sum;
  }
  return out;
}

/* ── the centreline ─────────────────────────────────────────── */

const SEGS = catmullRom(CTRL);
const dense: P[] = [];
for (const s of SEGS) for (let k = 0; k < 120; k++) dense.push(bez(s, k / 120));

/** Number of samples round the lap. */
export const N = 960;
const center = resample(dense, N);
/** Lap length (centreline) in user units. */
export const LAP = center.total;
/** Spacing between samples. */
export const DS = LAP / N;

export const CX = center.xs;
export const CY = center.ys;
/** Unit tangent (direction of travel) and heading angle per sample. */
export const TX = new Float64Array(N);
export const TY = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const dx = CX[wrap(i + 1, N)] - CX[wrap(i - 1, N)];
  const dy = CY[wrap(i + 1, N)] - CY[wrap(i - 1, N)];
  const l = Math.hypot(dx, dy) || 1;
  TX[i] = dx / l;
  TY[i] = dy / l;
}
/** Left normal (the driver's left): (ty, -tx). Positive offsets go left, which is the infield on this lap. */
export const NX = TY;
export const NY = new Float64Array(N).map((_, i) => -TX[i]);

/** Signed curvature, positive = turning left (towards +normal). */
const kRaw = new Float64Array(N);
for (let i = 0; i < N; i++) {
  const a0 = Math.atan2(TY[wrap(i - 1, N)], TX[wrap(i - 1, N)]);
  const a1 = Math.atan2(TY[wrap(i + 1, N)], TX[wrap(i + 1, N)]);
  kRaw[i] = -angDiff(a1 - a0) / (2 * DS);
}
export const KAPPA = blur(kRaw, 6 / DS > 1 ? 6 / DS : 1);

export const TRACK_D = bezierD(SEGS);

/* ── offsets ────────────────────────────────────────────────── */

/** Point at sample i shifted `o` units along the left normal. */
export function offsetPt(i: number, o: number): P {
  const j = wrap(Math.round(i), N);
  return [CX[j] + NX[j] * o, CY[j] + NY[j] * o];
}

/** Polyline "M..L.." through samples [from, to] (inclusive, may wrap) at a per-sample offset. */
export function offsetD(from: number, to: number, off: (i: number) => number, step = 1, close = false): string {
  const span = wrap(to - from, N);
  let d = "";
  for (let k = 0; k <= span; k += step) {
    const i = wrap(from + k, N);
    const o = off(i);
    d += `${k === 0 ? "M" : " "}${r1(CX[i] + NX[i] * o)} ${r1(CY[i] + NY[i] * o)}`;
  }
  if (span % step !== 0) {
    const i = wrap(to, N);
    const o = off(i);
    d += ` ${r1(CX[i] + NX[i] * o)} ${r1(CY[i] + NY[i] * o)}`;
  }
  return close ? `${d}Z` : d;
}

/* ── racing line: outside on entry, the inside kerb at the apex, outside again on exit ── */

const S1 = blur(KAPPA, 34 / DS);
const S2 = blur(KAPPA, 96 / DS);
const OMAX = HW - 8;
const offRaw = new Float64Array(N);
for (let i = 0; i < N; i++) offRaw[i] = OMAX * Math.tanh(((S1[i] - 0.8 * S2[i]) * 1700) / OMAX);
/** Racing-line offset from the centreline per sample. */
export const ROFF = blur(offRaw, 20 / DS);
export const RX = new Float64Array(N);
export const RY = new Float64Array(N);
for (let i = 0; i < N; i++) {
  RX[i] = CX[i] + NX[i] * ROFF[i];
  RY[i] = CY[i] + NY[i] * ROFF[i];
}
/** Cumulative racing-line length at each sample, and its total. */
export const RCUM = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) RCUM[i] = RCUM[i - 1] + Math.hypot(RX[i % N] - RX[i - 1], RY[i % N] - RY[i - 1]);
export const RLAP = RCUM[N];

/** The racing line as a smooth closed path through every 8th sample. */
export const RACE_D = (() => {
  const pts: P[] = [];
  for (let i = 0; i < N; i += 8) pts.push([RX[i], RY[i]]);
  return bezierD(catmullRom(pts));
})();

/* ── speed profile (a tiny lap simulation, so the car brakes, turns in and accelerates out) ── */

const V_MAX = 180;
const A_LAT = 66;
const A_ACC = 52;
const A_BRK = 120;
const kSpeed = blur(KAPPA, 14 / DS);
/** Target speed per sample (units/s) for the idle lap. */
export const VPROF = new Float64Array(N);
for (let i = 0; i < N; i++) VPROF[i] = Math.min(V_MAX, Math.sqrt(A_LAT / Math.max(Math.abs(kSpeed[i]), 1e-5)));
for (let pass = 0; pass < 2; pass++) {
  for (let i = 1; i <= N; i++) {
    const a = VPROF[(i - 1) % N];
    VPROF[i % N] = Math.min(VPROF[i % N], Math.sqrt(a * a + 2 * A_ACC * DS));
  }
  for (let i = N - 1; i >= 0; i--) {
    const b = VPROF[(i + 1) % N];
    VPROF[i] = Math.min(VPROF[i], Math.sqrt(b * b + 2 * A_BRK * DS));
  }
}
/** Elapsed idle-lap time at each sample, and the lap time (only used to split the sectors evenly). */
const TCUM = new Float64Array(N + 1);
for (let i = 1; i <= N; i++) TCUM[i] = TCUM[i - 1] + DS / ((VPROF[i - 1] + VPROF[i % N]) / 2);
export const LAP_TIME = TCUM[N];

/* ── sectors: five stretches, split on the straights between corners (each takes 4–6 s on the idle lap) ── */

/** First sample of each sector (sector k runs to the start of k+1). Sample 0 is the start/finish line. */
export const SECTOR_START: number[] = [0, 188, 350, 566, 748];
/** Idle-lap time spent in each sector, in seconds. */
export const SECTOR_TIME = SECTOR_START.map((a, k) => TCUM[k === 4 ? N : SECTOR_START[k + 1]] - TCUM[a]);
export function sectorOf(i: number): number {
  const j = wrap(Math.floor(i), N);
  let s = 0;
  for (let k = 0; k < SECTOR_START.length; k++) if (j >= SECTOR_START[k]) s = k;
  return s;
}
export const sectorEnd = (k: number) => (k === SECTOR_START.length - 1 ? N : SECTOR_START[k + 1]);
/** Mid sample of a sector (by distance). */
export const sectorMid = (k: number) => Math.round((SECTOR_START[k] + sectorEnd(k)) / 2) % N;
/** Sector start/end as fractions of the centreline and of the racing line (for dash windows). */
export const sectorFrac = (k: number) => ({ a: SECTOR_START[k] / N, b: sectorEnd(k) / N });
export const sectorRaceFrac = (k: number) => ({ a: RCUM[SECTOR_START[k]] / RLAP, b: RCUM[sectorEnd(k)] / RLAP });

/* ── turns, numbered in lap order (the apex points, snapped to the nearest sample) ── */

const TURN_PTS: readonly P[] = [
  [874, 694], // T1
  [848, 548], // T2
  [882, 454], // T3
  [920, 300], // T4
  [800, 100], // T5
  [130, 230], // T6 hairpin
  [446, 322], // T7
  [444, 444], // T8
  [240, 680], // T9 final corner
];
export function nearestSample(x: number, y: number, step = 1): number {
  let best = 0;
  let bd = Infinity;
  for (let i = 0; i < N; i += step) {
    const d = (CX[i] - x) ** 2 + (CY[i] - y) ** 2;
    if (d < bd) {
      bd = d;
      best = i;
    }
  }
  if (step > 1) {
    for (let j = best - step; j <= best + step; j++) {
      const i = wrap(j, N);
      const d = (CX[i] - x) ** 2 + (CY[i] - y) ** 2;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
  }
  return best;
}
const kTurn = blur(KAPPA, 16 / DS);
export const TURNS: { i: number; dir: 1 | -1 }[] = TURN_PTS.map(([x, y]) => {
  const i = nearestSample(x, y);
  return { i, dir: (kTurn[i] >= 0 ? 1 : -1) as 1 | -1 };
});
