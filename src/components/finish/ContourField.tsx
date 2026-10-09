/**
 * The map around the ignition: concentric contour rings, as if the finish were the summit of the sheet, printed
 * in Rock Blue on paper with every fourth ring an index contour in Venice, as on a survey sheet. One route-orange
 * road arrives from off the right edge of the map and runs in under the button, so the ignition reads as the end
 * of the drive. Deterministic (fixed harmonics, no randomness), so server and client render the same paths.
 */

const SIZE = 640;
const C = SIZE / 2;
const RINGS = 11;
const FIRST = 84;
const STEP = 21;
const SAMPLES = 96;

function ringPath(k: number) {
  const r = FIRST + k * STEP;
  let d = "";
  for (let i = 0; i <= SAMPLES; i += 1) {
    const t = (i / SAMPLES) * Math.PI * 2;
    // a few slow harmonics give each ring the wobble of real terrain; they drift with k so rings never repeat
    const wobble =
      1 +
      0.055 * Math.sin(3 * t + k * 0.55) +
      0.03 * Math.sin(5 * t - k * 0.9 + 1.2) +
      0.018 * Math.sin(2 * t + k * 0.35 + 2.4);
    const x = C + Math.cos(t) * r * wobble;
    const y = C + Math.sin(t) * r * wobble * 0.94;
    d += `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
  }
  return `${d}Z`;
}

const PATHS = Array.from({ length: RINGS }, (_, k) => ({ d: ringPath(k), index: k % 4 === 3 }));

/**
 * The road in. It starts well past the right edge of the field (the SVG overflows, the section clips it), so on
 * any screen it enters from off the map, then meanders across the rings and ends under the button's rim.
 */
const ROAD_D =
  "M1520 204C1488.3 213.7 1386.7 256.3 1330 262C1273.3 267.7 1228.3 232.7 1180 238C1131.7 243.3 1090 290 1040 294C990 298 929.3 263.3 880 262C830.7 260.7 786 291 744 286C702 281 663.7 238 628 232C592.3 226 559.3 240 530 250C500.7 260 478 281.7 452 292C426 302.3 387 308.7 374 312";

export function ContourField({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      fill="none"
      aria-hidden="true"
      focusable="false"
      className={`overflow-visible ${className}`}
    >
      {/*
        Written by the ignition while it is held (0..1): the rings darken (--ign) and, when motion is allowed,
        tighten toward the button (--ign-s). The road stays put; it already ends under the button.
      */}
      <g style={{ transformOrigin: `${C}px ${C}px`, transform: "scale(calc(1 - var(--ign-s, 0) * 0.05))" }}>
        {PATHS.map(({ d, index }) =>
          index ? (
            <path
              key={d}
              d={d}
              className="stroke-night"
              strokeWidth={1.4}
              vectorEffect="non-scaling-stroke"
              style={{ strokeOpacity: "calc(0.34 + var(--ign, 0) * 0.3)" }}
            />
          ) : (
            <path
              key={d}
              d={d}
              className="stroke-night"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
              style={{ strokeOpacity: "calc(0.18 + var(--ign, 0) * 0.3)" }}
            />
          ),
        )}
      </g>
      <path d={ROAD_D} className="stroke-paper" strokeOpacity={0.9} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
