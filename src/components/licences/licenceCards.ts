import type { Licence } from "@/content/site";
import { readColors, rgba, type SiteColors } from "@/lib/palette";

/**
 * Licence cards drawn at runtime in the site's map language (no image files):
 * paper ground, faint contour rings, a neat-line frame with graticule ticks, the issuer mark
 * top-left, the certification name in Panchang, the issue date in JetBrains Mono, a Venice
 * band carrying the issuer, and a Venice corner notch on the four primary certifications.
 * Client-only: uses document, canvas and fetch.
 */

export const CARD_W = 700;
export const CARD_H = 900;

const M = 64; // inner margin
const BAND = 150; // Venice band height

export type CardFonts = { display: string; text: string; mono: string };

function cssFamily(variable: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return v || fallback;
}

/** Real family names from next/font (hashed), read off <html>. */
export function readFonts(): CardFonts {
  return {
    display: cssFamily("--font-panchang", '"Arial Black", sans-serif'),
    text: cssFamily("--font-satoshi", "system-ui, sans-serif"),
    mono: cssFamily("--font-jetbrains", "ui-monospace, monospace"),
  };
}

/** Short issuer captions for under the cards (the full names are on the cards and in the list). */
export function shortIssuer(issuer: string): string {
  if (issuer === "Amazon Web Services") return "AWS";
  if (issuer === "Infosys Springboard") return "Infosys";
  return issuer;
}

// Deterministic PRNG, so every card keeps the same terrain on every visit.
function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Load an icon SVG as an image with explicit pixel size (Firefox will not rasterise size-less SVGs). */
async function loadIcon(name: string): Promise<{ img: HTMLImageElement; ratio: number } | null> {
  try {
    const res = await fetch(`/icons/${name}.svg`);
    if (!res.ok) return null;
    const svg = await res.text();
    const vb = /viewBox\s*=\s*"([^"]+)"/i.exec(svg);
    const parts = vb ? vb[1].trim().split(/[\s,]+/).map(Number) : [0, 0, 24, 24];
    const vw = parts[2] || 24;
    const vh = parts[3] || 24;
    const k = 512 / Math.max(vw, vh);
    const sized = svg.replace(/<svg\b([^>]*)>/i, (_m, attrs: string) => {
      const clean = attrs.replace(/\s(width|height)\s*=\s*"[^"]*"/gi, "");
      return `<svg${clean} width="${Math.round(vw * k)}" height="${Math.round(vh * k)}">`;
    });
    const url = URL.createObjectURL(new Blob([sized], { type: "image/svg+xml" }));
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    try {
      await img.decode();
    } finally {
      URL.revokeObjectURL(url);
    }
    return { img, ratio: vw / vh };
  } catch {
    return null;
  }
}

/** Faint contour rings around one or two "summits", like the corner of a survey sheet. */
function drawContours(ctx: CanvasRenderingContext2D, seed: number, C: SiteColors) {
  const rand = mulberry32(seed * 7919 + 17);
  const hills = [
    { cx: CARD_W * (0.62 + rand() * 0.3), cy: CARD_H * (0.18 + rand() * 0.3), rings: 11, gap: 34 + rand() * 10 },
    { cx: CARD_W * (rand() * 0.35), cy: CARD_H * (0.5 + rand() * 0.25), rings: 7, gap: 30 + rand() * 8 },
  ];
  ctx.save();
  ctx.lineJoin = "round";
  for (const h of hills) {
    const ph = [rand() * Math.PI * 2, rand() * Math.PI * 2, rand() * Math.PI * 2];
    const amp = [0.1 + rand() * 0.06, 0.05 + rand() * 0.04, 0.025 + rand() * 0.02];
    for (let r = 1; r <= h.rings; r++) {
      const base = r * h.gap;
      const index = r % 4 === 0;
      ctx.beginPath();
      for (let s = 0; s <= 160; s++) {
        const a = (s / 160) * Math.PI * 2;
        // rings drift a little as they widen, so the "slope" is not concentric
        const wobble = 1 + amp[0] * Math.sin(3 * a + ph[0] + r * 0.12) + amp[1] * Math.sin(5 * a + ph[1]) + amp[2] * Math.sin(8 * a + ph[2] - r * 0.2);
        const x = h.cx + Math.cos(a) * base * wobble * 1.08;
        const y = h.cy + Math.sin(a) * base * wobble * 0.86;
        if (s === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.strokeStyle = index ? rgba(C.venice, 0.2) : rgba(C.rock, 0.42);
      ctx.lineWidth = index ? 2.2 : 1.4;
      ctx.stroke();
    }
  }
  ctx.restore();
}

/** Neat line with graticule ticks: the frame printed around a map sheet. */
function drawFrame(ctx: CanvasRenderingContext2D, C: SiteColors) {
  const inset = 26;
  ctx.save();
  ctx.strokeStyle = rgba(C.venice, 0.55);
  ctx.lineWidth = 1.5;
  ctx.strokeRect(inset, inset, CARD_W - inset * 2, CARD_H - BAND - inset);
  ctx.strokeStyle = rgba(C.venice, 0.35);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let x = inset + 70; x < CARD_W - inset; x += 70) {
    ctx.moveTo(x, inset);
    ctx.lineTo(x, inset + 9);
  }
  for (let y = inset + 70; y < CARD_H - BAND; y += 70) {
    ctx.moveTo(inset, y);
    ctx.lineTo(inset + 9, y);
    ctx.moveTo(CARD_W - inset, y);
    ctx.lineTo(CARD_W - inset - 9, y);
  }
  ctx.stroke();
  ctx.restore();
}

/** Greedy wrap; shrinks the size until the name fits in `maxLines` without breaking a word. */
function fitName(ctx: CanvasRenderingContext2D, text: string, family: string, maxWidth: number, maxLines: number) {
  const words = text.split(/\s+/);
  for (let size = 58; size >= 30; size -= 2) {
    ctx.font = `700 ${size}px ${family}`;
    if (words.some((w) => ctx.measureText(w).width > maxWidth)) continue;
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (ctx.measureText(next).width <= maxWidth) line = next;
      else {
        lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    if (lines.length <= maxLines) return { size, lines };
  }
  ctx.font = `700 30px ${family}`;
  return { size: 30, lines: [text] };
}

function drawCard(licence: Licence, index: number, fonts: CardFonts, icon: { img: HTMLImageElement; ratio: number } | null, C: SiteColors): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // paper
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  drawContours(ctx, index + 1, C);
  drawFrame(ctx, C);

  // issuer mark, top-left, on a paper chip so contours never run through it
  if (icon) {
    const maxH = 64;
    const maxW = 250;
    let h = maxH;
    let w = h * icon.ratio;
    if (w > maxW) {
      w = maxW;
      h = w / icon.ratio;
    }
    const x = M;
    const y = 72 + (maxH - h) / 2;
    ctx.fillStyle = C.paper;
    ctx.fillRect(x - 12, y - 12, w + 24, h + 24);
    ctx.drawImage(icon.img, x, y, w, h);
  }

  // certification name
  const maxWidth = CARD_W - M * 2;
  const { size, lines } = fitName(ctx, licence.name, fonts.display, maxWidth, 5);
  ctx.font = `700 ${size}px ${fonts.display}`;
  ctx.fillStyle = C.ink;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  const lineH = size * 1.12;
  let y = 250 + size;
  for (const l of lines) {
    // a paper underlay keeps the letters clean over the contour lines
    ctx.fillStyle = rgba(C.paper, 0.78);
    ctx.fillRect(M - 6, y - size * 0.92, ctx.measureText(l).width + 12, size * 1.18);
    ctx.fillStyle = C.ink;
    ctx.fillText(l, M, y);
    y += lineH;
  }

  // issued date, mono, like a sheet's edition line
  ctx.font = `500 24px ${fonts.mono}`;
  const date = `ISSUED ${licence.issued.toUpperCase()}`;
  const dateY = CARD_H - BAND - 54;
  ctx.fillStyle = rgba(C.paper, 0.85);
  ctx.fillRect(M - 8, dateY - 26, ctx.measureText(date).width + 16, 36);
  ctx.fillStyle = C.venice;
  ctx.fillText(date, M, dateY);

  // Venice band with the issuer
  ctx.fillStyle = C.venice;
  ctx.fillRect(0, CARD_H - BAND, CARD_W, BAND);
  ctx.fillStyle = C.paper;
  ctx.font = `600 36px ${fonts.text}`;
  ctx.textBaseline = "middle";
  ctx.fillText(licence.issuer, M, CARD_H - BAND / 2);
  // a benchmark mark at the band's right edge
  ctx.strokeStyle = rgba(C.paper, 0.7);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(CARD_W - M - 14, CARD_H - BAND / 2, 14, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = rgba(C.paper, 0.9);
  ctx.beginPath();
  ctx.arc(CARD_W - M - 14, CARD_H - BAND / 2, 4, 0, Math.PI * 2);
  ctx.fill();

  // primary certifications get a Venice corner notch (orange is reserved for the road)
  if (licence.primary) {
    ctx.fillStyle = C.venice;
    ctx.beginPath();
    ctx.moveTo(CARD_W - 132, 0);
    ctx.lineTo(CARD_W, 0);
    ctx.lineTo(CARD_W, 132);
    ctx.closePath();
    ctx.fill();
  }

  // the canvas goes straight to WebGL as a texture: no image encode, no decode
  return canvas;
}

/** Hands the main thread back between cards, so drawing never becomes one long task. */
function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: { yield?: () => Promise<void> } }).scheduler;
  if (scheduler?.yield) return scheduler.yield();
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Draws all cards once fonts and issuer marks are ready, one card per task. Returns canvases in `licences` order. */
export async function drawLicenceCards(licences: Licence[], fonts: CardFonts): Promise<HTMLCanvasElement[]> {
  if (document.fonts?.load) {
    await Promise.allSettled([
      document.fonts.load(`700 48px ${fonts.display}`),
      document.fonts.load(`600 36px ${fonts.text}`),
      document.fonts.load(`500 24px ${fonts.mono}`),
    ]);
  }
  const names = Array.from(new Set(licences.map((l) => l.icon).filter((n): n is string => Boolean(n))));
  const icons = new Map<string, { img: HTMLImageElement; ratio: number } | null>();
  await Promise.all(
    names.map(async (n) => {
      icons.set(n, await loadIcon(n));
    }),
  );
  const colors = readColors();
  const cards: HTMLCanvasElement[] = [];
  for (const [i, l] of licences.entries()) {
    await yieldToMain();
    cards.push(drawCard(l, i, fonts, l.icon ? (icons.get(l.icon) ?? null) : null, colors));
  }
  return cards;
}
