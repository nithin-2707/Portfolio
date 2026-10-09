import {
  lanes,
  monthIndex,
  nextStage,
  ROUTE_END,
  ROUTE_MONTHS,
  ROUTE_START,
  routeItems,
  stageFlags,
  type RouteItem,
} from "@/content/timeline";

/**
 * Pure geometry for the stage-profile strip: the time scale, the elevation profile, the lane items and
 * their label placement. Everything is in strip-local CSS pixels, measured from the live layout, so the SVG
 * draws 1:1 (no viewBox scaling, strokes stay crisp at every width).
 */

/** The plot runs to the end of the last month on the route (ROUTE_END is drawn as a whole month). */
export const END_M = ROUTE_MONTHS + 1;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const [Y0, M0] = ROUTE_START.split("-").map(Number);
const Y1 = Number(ROUTE_END.split("-")[0]);

/** "Jul 2026" for a month index on the route. */
export function monthLabel(m: number) {
  const t = M0 - 1 + Math.max(0, Math.floor(m));
  return `${MONTHS[t % 12]} ${Y0 + Math.floor(t / 12)}`;
}

export type Prepared = {
  id: string;
  item: RouteItem;
  lane: number;
  /** first month (index) */
  s: number;
  /** month after the last one (exclusive); open stretches run to END_M */
  e: number;
  open: boolean;
  event: boolean;
};

export const PREPARED: Prepared[] = routeItems.map((item, i) => {
  const s = monthIndex(item.start);
  const open = item.kind === "bar" && item.end === "open";
  const e = item.kind === "event" ? s + 1 : open ? END_M : monthIndex(item.end ?? item.start) + 1;
  return {
    id: `rp-item-${i}`,
    item,
    lane: Math.max(0, lanes.findIndex((l) => l.id === item.lane)),
    s,
    e,
    open,
    event: item.kind === "event",
  };
});

/** Reading order: by start month, then lane. Used by the list, the pace notes and keyboard stepping. */
export const CHRONO: Prepared[] = [...PREPARED].sort((a, b) => a.s - b.s || a.lane - b.lane);

export const LANE_LABEL: Record<string, string> = Object.fromEntries(lanes.map((l) => [l.id, l.label]));

export const NEXT_STAGE = nextStage;

/** How many things were on the road each month: stretches running that month plus milestones in it. */
export const PROFILE: number[] = Array.from({ length: END_M }, (_, m) =>
  PREPARED.reduce((n, p) => n + (p.s <= m && m < p.e ? 1 : 0), 0),
);
const PROFILE_MAX = Math.max(1, ...PROFILE);

/**
 * The time scale is a road atlas's, not a ruler's: each year gets width in proportion to how much happened in
 * it (1 + n^1.25 for the n items that touch it), so the quiet early years fold up and 2025–26 open out enough to label.
 * The year ticks and month ticks show the scale honestly; the profile height is never rescaled.
 */
const YEARS = Array.from({ length: Y1 - Y0 + 1 }, (_, i) => {
  const y = Y0 + i;
  const m0 = Math.max(0, monthIndex(`${y}-01`));
  const m1 = Math.min(END_M, monthIndex(`${y + 1}-01`));
  const n = PREPARED.filter((p) => p.s < m1 && p.e > m0).length;
  return { y, m0, m1, w: 1 + Math.pow(n, 1.25) };
}).filter((y) => y.m1 > y.m0);

/** Abbreviations, used only when a full label cannot be placed without a collision. */
const SHORT: Record<string, string> = {
  "B.Tech, Computer Science": "B.Tech, CSE",
  "Java 11 Essentials": "Java 11",
  "First public repos": "First repos",
  "MongoDB DBA Associate": "MongoDB DBA",
  "StyleSync · LPG Navigator": "StyleSync · LPG",
  "OCI Generative AI Professional": "OCI Gen AI Pro",
  "AWS Cloud Practitioner": "AWS Cloud Pract.",
  "LLM extraction service": "LLM extraction",
};

/** The three internships, tied to the stretch each one starts (for their lit range). */
export const FLAGS = stageFlags.map((f) => {
  const s = monthIndex(f.at);
  const item =
    PREPARED.find((p) => p.s === s && !p.event && p.item.label.startsWith(f.label)) ??
    PREPARED.find((p) => p.s === s && !p.event);
  return { code: f.code, label: f.label, s, itemId: item?.id };
});

/* ── layout constants (px) ─────────────────────────────────────────── */

/** road centre, measured down from the bottom of the profile row */
export const ROAD_OFF = 15;
export const ROAD_HALF = 7;
/** room above the highest ridge for the stage flags */
const FLAG_ROOM = 40;
const FLAG_POLE = 24;
export const PENNANT_W = 31;
export const PENNANT_H = 15;
/** the lowest the silhouette ever sits, so the plain stays visible */
const MIN_H = 3;
export const BAR_HALF = 4;
export const LABEL_SIZE = 12.5;
const LABEL_PAD = 20;
const PLOT_PAD = 18;
const BAR_GAP = 7;

export type Frame = {
  W: number;
  H: number;
  labelW: number;
  aheadX: number;
  profileH: number;
  lanes: { top: number; h: number }[];
};

export type Measure = (text: string, weight: number) => number;

export type LabelGeo = {
  text: string;
  short: boolean;
  x: number;
  y: number;
  anchor: "start" | "middle" | "end";
  side: "above" | "below" | "inline";
  a: number;
  b: number;
  weight: number;
};

export type ItemGeo = {
  p: Prepared;
  cy: number;
  /** drawn road start/end (open roads run on into the fade) */
  x0: number;
  x1: number;
  /** where the orange stripe may run to */
  stripeEnd: number;
  /** the item stays lit until the marker passes this x */
  curEnd: number;
  label: LabelGeo;
  hit: { x: number; y: number; w: number; h: number };
};

export type FlagGeo = { code: string; label: string; x: number; y: number; top: number; curStart: number; curEnd: number };

export type Geometry = {
  key: string;
  W: number;
  H: number;
  px0: number;
  px1: number;
  roadY: number;
  baseY: number;
  topY: number;
  startX: number;
  finishX: number;
  fadeEnd: number;
  lanesTop: number;
  lanesBottom: number;
  laneLines: number[];
  laneCy: number[];
  years: { label: string; x: number }[];
  monthTicks: number[];
  ridge: string;
  fill: string;
  /** ridge height where the route ends (the finish flag stands on it) */
  ridgeEndY: number;
  finishFlagY: number;
  contours: number[];
  flags: FlagGeo[];
  items: ItemGeo[];
  /** month index at an x on the plot */
  mOf: (x: number) => number;
};

/* ── monotone cubic (Fritsch–Carlson): smooth, but never overshoots the data ── */

function monotone(xs: number[], ys: number[]) {
  const n = xs.length;
  const d: number[] = [];
  for (let i = 0; i < n - 1; i += 1) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1));
  const m: number[] = new Array(n).fill(0);
  m[0] = d[0] ?? 0;
  m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i += 1) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i];
    const b = m[i + 1] / d[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * d[i];
      m[i + 1] = t * b * d[i];
    }
  }
  const f = (v: number) => v.toFixed(2);
  let path = `M${f(xs[0])} ${f(ys[0])}`;
  for (let i = 0; i < n - 1; i += 1) {
    const h = xs[i + 1] - xs[i];
    path += `C${f(xs[i] + h / 3)} ${f(ys[i] + (m[i] * h) / 3)} ${f(xs[i + 1] - h / 3)} ${f(ys[i + 1] - (m[i + 1] * h) / 3)} ${f(xs[i + 1])} ${f(ys[i + 1])}`;
  }
  const at = (x: number) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (i < n - 2 && x > xs[i + 1]) i += 1;
    const h = xs[i + 1] - xs[i] || 1;
    const t = (x - xs[i]) / h;
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * h * m[i + 1]
    );
  };
  return { path, at };
}

/* ── label placement ──────────────────────────────────────────────── */

/** `pref` is the option's own cost: road names prefer to start where their road starts, milestones to sit centred under their dot. */
type Cand = { side: "above" | "below" | "inline"; anchor: "start" | "middle" | "end"; x: number; pref: number };

function spanOf(c: Cand, w: number): [number, number] {
  const a = c.anchor === "start" ? c.x : c.anchor === "end" ? c.x - w : c.x - w / 2;
  return [a, a + w];
}

export function buildGeometry(fr: Frame, measure: Measure): Geometry {
  const { W, H, labelW, aheadX } = fr;
  const px0 = labelW + PLOT_PAD;
  const px1 = Math.max(px0 + 200, aheadX);

  // piecewise-linear year scale
  // every year keeps room for its tick label; the rest is shared by weight
  const span = px1 - px0;
  const MIN_YEAR = 48;
  const widths = YEARS.map((y) => y.w);
  for (let k = 0; k < 4; k += 1) {
    const sum = widths.reduce((n, w) => n + w, 0);
    let fixed = 0;
    let free = 0;
    widths.forEach((w, i) => {
      if ((w / sum) * span < MIN_YEAR) fixed += 1;
      else free += YEARS[i].w;
    });
    if (!fixed) break;
    const freeSpan = span - fixed * MIN_YEAR;
    YEARS.forEach((y, i) => {
      widths[i] = (widths[i] / sum) * span < MIN_YEAR ? (MIN_YEAR / span) * sum : (y.w / free) * (freeSpan / span) * sum;
    });
  }
  const total = widths.reduce((n, w) => n + w, 0);
  let acc = px0;
  const segs = YEARS.map((y, i) => {
    const w = (widths[i] / total) * span;
    const seg = { ...y, x0: acc, x1: acc + w };
    acc += w;
    return seg;
  });
  const xOf = (m: number) => {
    const mm = Math.min(END_M, Math.max(0, m));
    const seg = segs.find((s) => mm < s.m1) ?? segs[segs.length - 1];
    return seg.x0 + ((mm - seg.m0) / (seg.m1 - seg.m0)) * (seg.x1 - seg.x0);
  };
  const mOf = (x: number) => {
    const xx = Math.min(px1, Math.max(px0, x));
    const seg = segs.find((s) => xx < s.x1) ?? segs[segs.length - 1];
    return seg.m0 + ((xx - seg.x0) / (seg.x1 - seg.x0 || 1)) * (seg.m1 - seg.m0);
  };

  const roadY = fr.profileH + ROAD_OFF;
  const baseY = roadY - ROAD_HALF - 1;
  const topY = FLAG_ROOM;
  const lanesTop = fr.lanes[0]?.top ?? roadY + 40;
  const lastLane = fr.lanes[fr.lanes.length - 1];
  const lanesBottom = lastLane ? lastLane.top + lastLane.h : H;
  const laneLines = [...fr.lanes.map((l) => l.top), lanesBottom];
  const laneCy = fr.lanes.map((l) => l.top + l.h / 2);

  /* profile */
  const vy = (v: number) => baseY - (MIN_H + (v / PROFILE_MAX) * (baseY - topY - MIN_H));
  const xs = [px0, ...PROFILE.map((_, m) => xOf(m + 0.5)), px1];
  const ys = [vy(PROFILE[0]), ...PROFILE.map(vy), vy(PROFILE[PROFILE.length - 1])];
  const curve = monotone(xs, ys);
  const fill = `${curve.path}L${px1.toFixed(2)} ${baseY.toFixed(2)}L${px0.toFixed(2)} ${baseY.toFixed(2)}Z`;
  const contours: number[] = [];
  for (let y = baseY - 5; y > topY - 4; y -= 5) contours.push(y);

  /* axis */
  const years = segs.map((s) => ({ label: String(s.y), x: s.x0 }));
  const monthTicks: number[] = [];
  for (let m = 1; m < END_M; m += 1) monthTicks.push(xOf(m));

  const aheadW = W - px1;
  const fadeEnd = px1 + Math.min(120, Math.max(56, aheadW * 0.55));
  const finishX = px1 + Math.min(96, Math.max(48, aheadW * 0.4));
  // the car sets off on the plot, so it is never parked under the (sticky, on phones) lane labels
  const startX = px0 + 2;

  /* items: roads first, then the gaps where one stretch hands over to the next in the same lane */
  const raw = PREPARED.map((p) => {
    const event = p.event;
    const x0 = event ? xOf(p.s + 0.5) : xOf(p.s);
    const x1 = event ? x0 : p.open ? fadeEnd : xOf(p.e);
    return { p, x0, x1 };
  });
  lanes.forEach((_, li) => {
    const bars = raw.filter((r) => r.p.lane === li && !r.p.event).sort((a, b) => a.x0 - b.x0);
    for (let i = 0; i < bars.length - 1; i += 1) {
      const prev = bars[i];
      const next = bars[i + 1];
      if (prev.x1 > next.x0 - BAR_GAP) {
        const mid = prev.p.e > next.p.s ? xOf((next.p.s + prev.p.e) / 2) : (prev.x1 + next.x0) / 2;
        prev.x1 = mid - BAR_GAP / 2;
        next.x0 = mid + BAR_GAP / 2;
      }
    }
  });

  const minX = px0 - 4;
  const maxX = W - 4;

  /*
   * Label placement as a small cost minimisation. Each item has a handful of options (above/below, anchored
   * at its start, middle or end; full text, then an abbreviation). Cost: a collision in the same lane and side
   * is forbidden in practice (1000/px), a label sitting right under one from the next lane down is
   * discouraged (it reads as one stack across the lane marking), an abbreviation costs about as much as a
   * 60px stack, and later options cost a little more than earlier ones. Coordinate descent from the first
   * options settles in a few passes.
   */
  type Opt = { label: LabelGeo; rank: number };
  const entries = raw.map((r) => {
    const { p } = r;
    const weight = p.event ? 500 : 600;
    const cands: Cand[] = p.event
      ? [
          // a waypoint label on the road itself, to the right of its dot, wherever the road ahead is empty
          { side: "inline", anchor: "start", x: r.x0 + 9, pref: 0 },
          { side: "below", anchor: "middle", x: r.x0, pref: 2 },
          { side: "below", anchor: "start", x: r.x0 - 6, pref: 8 },
          { side: "below", anchor: "end", x: r.x0 + 6, pref: 8 },
          { side: "above", anchor: "middle", x: r.x0, pref: 4 },
          { side: "above", anchor: "start", x: r.x0 - 6, pref: 12 },
          { side: "above", anchor: "end", x: r.x0 + 6, pref: 12 },
        ]
      : [
          { side: "above", anchor: "start", x: r.x0 + 1, pref: 0 },
          { side: "below", anchor: "start", x: r.x0 + 1, pref: 4 },
          { side: "above", anchor: "end", x: Math.min(r.x1, px1) - 1, pref: 40 },
          { side: "below", anchor: "end", x: Math.min(r.x1, px1) - 1, pref: 44 },
        ];
    const texts: { text: string; short: boolean }[] = [{ text: p.item.label, short: false }];
    if (SHORT[p.item.label]) texts.push({ text: SHORT[p.item.label], short: true });
    const opts: Opt[] = [];
    texts.forEach((t, ti) => {
      const w = measure(t.text, weight);
      cands.forEach((c) => {
        const [a, b] = spanOf(c, w);
        if (a < minX || b > maxX) return;
        opts.push({ label: { text: t.text, short: t.short, x: c.x, y: 0, anchor: c.anchor, side: c.side, a, b, weight }, rank: c.pref + ti * 120 });
      });
    });
    if (!opts.length) {
      // nothing fits the sheet: the shortest text, clamped inside it
      const t = texts[texts.length - 1];
      const w = measure(t.text, weight);
      let [a, b] = spanOf(cands[0], w);
      if (a < minX) [a, b] = [minX, minX + w];
      if (b > maxX) [a, b] = [maxX - w, maxX];
      opts.push({ label: { text: t.text, short: t.short, x: a, y: 0, anchor: "start", side: cands[0].side, a, b, weight }, rank: 300 });
    }
    return { r, opts, pick: 0 };
  });

  const overlap = (a1: number, b1: number, a2: number, b2: number) =>
    Math.max(0, Math.min(b1, b2 + LABEL_PAD) - Math.max(a1, a2 - LABEL_PAD));
  const costOf = (i: number, o: Opt) => {
    const self = entries[i].r;
    const lane = self.p.lane;
    const L = o.label;
    let c = o.rank;
    entries.forEach((f, j) => {
      if (j === i) return;
      const M = f.opts[f.pick].label;
      const fl = f.r.p.lane;
      if (fl === lane) {
        if (M.side === L.side) c += 1000 * overlap(L.a, L.b, M.a, M.b);
        if (L.side === "inline") {
          // on the centre line nothing else may sit under the words: no road, no other waypoint
          const ra = f.r.p.event ? f.r.x0 - 6 : f.r.x0 - BAR_HALF;
          const rb = f.r.p.event ? f.r.x0 + 6 : Math.min(f.r.x1, px1 + 40) + BAR_HALF;
          c += 1000 * Math.max(0, Math.min(L.b + 10, rb) - Math.max(L.a - 10, ra));
        }
        // a label hanging over someone else's road reads as that road's name
        if (!f.r.p.event && L.side !== "inline") c += 0.6 * Math.max(0, Math.min(L.b, Math.min(f.r.x1, px1)) - Math.max(L.a, f.r.x0));
      } else if (
        (fl === lane + 1 && L.side === "below" && M.side === "above") ||
        (fl === lane - 1 && L.side === "above" && M.side === "below")
      ) {
        c += 2 * overlap(L.a, L.b, M.a, M.b);
      }
    });
    return c;
  };
  const totalCost = () => entries.reduce((n, e, i) => n + costOf(i, e.opts[e.pick]), 0);

  const order = entries.map((_, i) => i).sort((a, b) => entries[a].r.p.lane - entries[b].r.p.lane || entries[a].r.x0 - entries[b].r.x0);
  const descend = () => {
    for (let pass = 0; pass < 12; pass += 1) {
      let changed = false;
      for (const i of order) {
        const e = entries[i];
        let best = e.pick;
        let bestCost = costOf(i, e.opts[e.pick]);
        e.opts.forEach((o, k) => {
          if (k === e.pick) return;
          const c = costOf(i, o);
          if (c < bestCost - 0.01) {
            best = k;
            bestCost = c;
          }
        });
        if (best !== e.pick) {
          e.pick = best;
          changed = true;
        }
      }
      if (!changed) break;
    }
  };
  descend();
  // pair moves: two neighbouring labels may need to change sides together to get out of each other's way
  const reach = entries.map((e) => [Math.min(...e.opts.map((o) => o.label.a)), Math.max(...e.opts.map((o) => o.label.b))]);
  const pairs: [number, number][] = [];
  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      if (Math.abs(entries[i].r.p.lane - entries[j].r.p.lane) > 1) continue;
      if (reach[i][1] + LABEL_PAD < reach[j][0] || reach[j][1] + LABEL_PAD < reach[i][0]) continue;
      pairs.push([i, j]);
    }
  }
  for (let round = 0; round < 4; round += 1) {
    let improved = false;
    for (const [i, j] of pairs) {
      const ei = entries[i];
      const ej = entries[j];
      const pi = ei.pick;
      const pj = ej.pick;
      let best: [number, number] = [pi, pj];
      let bestCost = costOf(i, ei.opts[pi]) + costOf(j, ej.opts[pj]);
      for (let a = 0; a < ei.opts.length; a += 1) {
        for (let b = 0; b < ej.opts.length; b += 1) {
          if (a === pi && b === pj) continue;
          ei.pick = a;
          ej.pick = b;
          const c = costOf(i, ei.opts[a]) + costOf(j, ej.opts[b]);
          if (c < bestCost - 0.01) {
            best = [a, b];
            bestCost = c;
          }
        }
      }
      ei.pick = best[0];
      ej.pick = best[1];
      if (best[0] !== pi || best[1] !== pj) improved = true;
    }
    descend();
    if (!improved) break;
  }

  // a short seeded search out of local minima (three labels sometimes need to move at once); deterministic,
  // so the same width always gets the same layout
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  let bestTotal = totalCost();
  let bestPicks = entries.map((e) => e.pick);
  for (let k = 0; k < 80 && bestTotal > 0.5; k += 1) {
    for (let n = 0; n < 2; n += 1) {
      const e = entries[Math.floor(rand() * entries.length)];
      e.pick = Math.floor(rand() * e.opts.length);
    }
    descend();
    const t = totalCost();
    if (t < bestTotal - 0.01) {
      bestTotal = t;
      bestPicks = entries.map((e) => e.pick);
    } else {
      entries.forEach((e, i) => (e.pick = bestPicks[i]));
    }
  }
  entries.forEach((e, i) => (e.pick = bestPicks[i]));

  const items: ItemGeo[] = entries.map(({ r, opts, pick }) => {
    const { p } = r;
    const cy = laneCy[p.lane] ?? 0;
    const chosen = { ...opts[pick].label };
    chosen.y = chosen.side === "above" ? cy - BAR_HALF - 7 : chosen.side === "below" ? cy + BAR_HALF + 15 : cy + 4.4;
    const roadA = p.event ? r.x0 - 6 : r.x0 - BAR_HALF;
    const roadB = p.event ? r.x0 + 6 : Math.min(r.x1, p.open ? px1 + 24 : r.x1) + BAR_HALF;
    const hx0 = Math.min(roadA, chosen.a) - 5;
    const hx1 = Math.max(roadB, chosen.b) + 5;
    const hy0 = chosen.side === "above" ? cy - 23 : chosen.side === "below" ? cy - 9 : cy - 11;
    const hy1 = chosen.side === "above" ? cy + 9 : chosen.side === "below" ? cy + 23 : cy + 11;
    return {
      p,
      cy,
      x0: r.x0,
      x1: r.x1,
      stripeEnd: p.open ? fadeEnd : r.x1,
      curEnd: p.event ? r.x0 + 26 : p.open ? Number.POSITIVE_INFINITY : r.x1 + 1,
      label: chosen,
      hit: { x: hx0, y: hy0, w: hx1 - hx0, h: hy1 - hy0 },
    };
  });
  // keep the source order so React keys and keyboard order stay stable
  items.sort((a, b) => PREPARED.indexOf(a.p) - PREPARED.indexOf(b.p));

  /* stage flags, planted on the ridge */
  const flags: FlagGeo[] = FLAGS.map((f) => {
    const x = xOf(f.s);
    const y = curve.at(x);
    const it = items.find((i) => i.p.id === f.itemId);
    // the pennant flies clear of the ridge it stands on (a flag at the foot of a climb would cut into it)
    let ridgeTop = y;
    for (let k = 0; k <= 8; k += 1) ridgeTop = Math.min(ridgeTop, curve.at(x + (k / 8) * (PENNANT_W + 2)));
    const top = Math.min(y - FLAG_POLE, ridgeTop - PENNANT_H - 5);
    return {
      code: f.code,
      label: f.label,
      x,
      y,
      top,
      curStart: it ? it.x0 : x,
      curEnd: it ? it.curEnd : x + 30,
    };
  });

  return {
    key: `${Math.round(W)}x${Math.round(H)}`,
    W,
    H,
    px0,
    px1,
    roadY,
    baseY,
    topY,
    startX,
    finishX,
    fadeEnd,
    lanesTop,
    lanesBottom,
    laneLines,
    laneCy,
    years,
    monthTicks,
    ridge: curve.path,
    fill,
    ridgeEndY: ys[ys.length - 1],
    finishFlagY: ys[ys.length - 1] - FLAG_POLE,
    contours,
    flags,
    items,
    mOf,
  };
}

/** Car x for a drive progress 0..1: the plot takes the first 90%, then the car rolls on to the next stage. */
export function carX(g: Geometry, p: number) {
  const P = 0.9;
  const t = Math.min(1, Math.max(0, p));
  if (t <= P) return g.startX + (t / P) * (g.px1 - g.startX);
  const u = (t - P) / (1 - P);
  return g.px1 + (1 - (1 - u) * (1 - u)) * (g.finishX - g.px1);
}
