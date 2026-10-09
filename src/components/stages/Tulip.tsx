import type { Stage } from "@/content/site";

/**
 * Rally-roadbook tulip diagrams. Read bottom to top:
 *  - a filled dot is where you come from,
 *  - a straight approach line runs up to the junction,
 *  - the exit you take is the thick line ending in an arrowhead (route orange),
 *  - every road you do not take is a thin stub.
 * One distinct junction per turn: a crossroads (right), a Y-fork (keep right),
 * a roundabout (left, first exit: clockwise, as on Indian roads) and a straight-on crossroads.
 * viewBox is 120 × 120; strokes scale with the diagram.
 *
 * The exit and its arrowhead also exist as a paper "ghost" ([data-tulip-ghost]) under the orange ones. It is
 * hidden in the server HTML (the finished diagram), and shown by Stages' resting state: the whole junction
 * at low opacity with the exit not yet driven, so a box's tulip column is never empty before its turn.
 */

type Pt = readonly [number, number];

type Geometry = {
  dot: Pt;
  approach: string;
  stubs: string[];
  ring?: { c: Pt; r: number };
  exit: string;
  arrow: string;
};

const f = (n: number) => Math.round(n * 100) / 100;

/** Arrowhead with its base centred on `base`, pointing along `dir`. */
function arrowHead(base: Pt, dir: Pt, len = 12.5, half = 7) {
  const l = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / l;
  const uy = dir[1] / l;
  const px = -uy;
  const py = ux;
  const tip = [base[0] + ux * len, base[1] + uy * len];
  const b1 = [base[0] + px * half, base[1] + py * half];
  const b2 = [base[0] - px * half, base[1] - py * half];
  return [tip, b1, b2].map(([x, y]) => `${f(x)},${f(y)}`).join(" ");
}

/** The point the exit line should stop at: 1.5 units inside the arrowhead, so the cap tucks under it. */
function tuck(base: Pt, dir: Pt, into = 1.5): Pt {
  const l = Math.hypot(dir[0], dir[1]) || 1;
  return [f(base[0] + (dir[0] / l) * into), f(base[1] + (dir[1] / l) * into)];
}

const DOT: Pt = [60, 103];

function crossroadsRight(): Geometry {
  const base: Pt = [91, 58];
  const dir: Pt = [1, 0];
  const end = tuck(base, dir);
  return {
    dot: DOT,
    approach: "M60 103V58",
    stubs: ["M60 58V21", "M60 58H23"],
    exit: `M60 58H${end[0]}`,
    arrow: arrowHead(base, dir),
  };
}

function forkKeepRight(): Geometry {
  const base: Pt = [79, 36.5];
  const dir: Pt = [12, -11.5];
  const end = tuck(base, dir);
  return {
    dot: DOT,
    approach: "M60 103V68",
    stubs: ["M60 68C60 58 54 50 44 41"],
    exit: `M60 68C60 57 67 48 ${end[0]} ${end[1]}`,
    arrow: arrowHead(base, dir),
  };
}

function roundaboutLeft(): Geometry {
  const c: Pt = [60, 54];
  const r = 12.5;
  const base: Pt = [31, 54];
  const dir: Pt = [-1, 0];
  const end = tuck(base, dir);
  return {
    dot: DOT,
    approach: `M60 103V${c[1] + r}`,
    ring: { c, r },
    stubs: [`M60 ${c[1] - r}V20`, `M${c[0] + r} 54H97`],
    // bottom of the ring -> clockwise quarter (sweep 1 = clockwise on screen) -> out to the left
    exit: `M60 ${c[1] + r}A${r} ${r} 0 0 1 ${c[0] - r} ${c[1]}H${end[0]}`,
    arrow: arrowHead(base, dir),
  };
}

function crossroadsStraight(): Geometry {
  const base: Pt = [60, 32];
  const dir: Pt = [0, -1];
  const end = tuck(base, dir);
  return {
    dot: DOT,
    approach: "M60 103V60",
    stubs: ["M60 60H23", "M60 60H97"],
    exit: `M60 60V${end[1]}`,
    arrow: arrowHead(base, dir),
  };
}

const GEOMETRY: Record<Stage["turn"], Geometry> = {
  right: crossroadsRight(),
  fork: forkKeepRight(),
  left: roundaboutLeft(),
  straight: crossroadsStraight(),
};

export function Tulip({ turn, className = "" }: { turn: Stage["turn"]; className?: string }) {
  const g = GEOMETRY[turn];
  return (
    <svg
      viewBox="0 0 120 120"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={className}
      data-tulip=""
    >
      {g.ring ? (
        <circle
          data-tulip-ring=""
          cx={g.ring.c[0]}
          cy={g.ring.c[1]}
          r={g.ring.r}
          transform={`rotate(90 ${g.ring.c[0]} ${g.ring.c[1]})`}
          className="stroke-current"
          strokeOpacity={0.62}
          strokeWidth={0.9}
        />
      ) : null}
      {g.stubs.map((d) => (
        <path
          key={d}
          data-tulip-stub=""
          d={d}
          className="stroke-current"
          strokeOpacity={0.62}
          strokeWidth={0.9}
          strokeLinecap="round"
        />
      ))}
      <path data-tulip-approach="" d={g.approach} className="stroke-current" strokeWidth={1.2} strokeLinecap="round" />
      <g data-tulip-ghost="" visibility="hidden">
        <path d={g.exit} className="stroke-current" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <polygon points={g.arrow} className="fill-current stroke-current" strokeWidth={0.8} strokeLinejoin="round" />
      </g>
      <path
        data-tulip-exit=""
        d={g.exit}
        className="stroke-route"
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polygon
        data-tulip-arrow=""
        points={g.arrow}
        className="fill-route stroke-route"
        strokeWidth={0.8}
        strokeLinejoin="round"
      />
      <circle data-tulip-dot="" cx={g.dot[0]} cy={g.dot[1]} r={3.6} className="fill-current" />
    </svg>
  );
}
