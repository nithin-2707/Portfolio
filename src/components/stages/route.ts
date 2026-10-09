/**
 * Geometry for the Stages route line: a road that runs straight under each roadbook box and
 * bends once in every gap between boxes. Built as a dense polyline in real pixels (no viewBox
 * scaling), so DrawSVG lengths are exact and the stroke never distorts.
 */

export type Bend = {
  /** gap start (px, track space) */
  a: number;
  /** gap end */
  b: number;
  /** signed bend depth in px: negative bends up, positive bends down */
  amp: number;
};

export type RouteGeometry = {
  d: string;
  xs: number[];
  ys: number[];
  /** cumulative length at each point */
  cum: number[];
  length: number;
  start: number;
  end: number;
  base: number;
};

const STEP = 5;

const r1 = (n: number) => Math.round(n * 10) / 10;

export function buildRoute({
  start,
  end,
  base,
  bends,
}: {
  start: number;
  end: number;
  base: number;
  bends: Bend[];
}): RouteGeometry {
  const xs: number[] = [start];
  const ys: number[] = [base];
  const push = (x: number, y: number) => {
    if (x <= xs[xs.length - 1]) return;
    xs.push(x);
    ys.push(y);
  };

  const sorted = bends
    .filter((bd) => bd.b > bd.a && bd.a >= start && bd.b <= end)
    .sort((p, q) => p.a - q.a);

  for (const bd of sorted) {
    push(bd.a, base);
    const span = bd.b - bd.a;
    const steps = Math.max(8, Math.ceil(span / STEP));
    for (let i = 1; i < steps; i += 1) {
      const t = i / steps;
      // (1 - cos 2πt) / 2: zero slope where it leaves and rejoins the straight, so the road never kinks
      push(bd.a + span * t, base + bd.amp * (1 - Math.cos(Math.PI * 2 * t)) * 0.5);
    }
    push(bd.b, base);
  }
  push(end, base);

  const cum: number[] = [0];
  for (let i = 1; i < xs.length; i += 1) {
    cum.push(cum[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  }

  let d = `M${r1(xs[0])} ${r1(ys[0])}`;
  for (let i = 1; i < xs.length; i += 1) d += `L${r1(xs[i])} ${r1(ys[i])}`;

  return { d, xs, ys, cum, length: cum[cum.length - 1], start, end, base };
}

/** Arc length of the route from its start up to track-x `x` (clamped to the route). */
export function lengthAtX(geo: RouteGeometry, x: number): number {
  const { xs, cum } = geo;
  if (x <= xs[0]) return 0;
  const last = xs.length - 1;
  if (x >= xs[last]) return cum[last];
  let lo = 0;
  let hi = last;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (xs[mid] <= x) lo = mid;
    else hi = mid;
  }
  const t = (x - xs[lo]) / (xs[hi] - xs[lo] || 1);
  return cum[lo] + (cum[hi] - cum[lo]) * t;
}
