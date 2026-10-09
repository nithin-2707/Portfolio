/**
 * Panchang and Satoshi come from Fontshare (Indian Type Foundry). Their licence (ITF Free Font License) allows them
 * on this site but does not allow the font files to be redistributed, so they are not part of this repository.
 *
 * Instead, at build time the page asks the Fontshare API for the @font-face rules and inlines them into the HTML,
 * so a visitor's browser goes straight to Fontshare's CDN for the font files (preconnected and preloaded, no extra
 * stylesheet round trip). If the API cannot be reached, the site falls back to metric-matched local fonts
 * ("Panchang Fallback" / "Satoshi Fallback" in globals.css) and still builds.
 *
 * The API serves one family per request reliably (asking for Panchang and Satoshi together returns another family),
 * so each family is its own request.
 */

const API = "https://api.fontshare.com/v2/css";

/** the variable Panchang (200–800), Satoshi upright + italic (300–900), and Panchang's static Extrabold cut */
const QUERIES = {
  panchang: "f%5B%5D=panchang%401",
  satoshi: "f%5B%5D=satoshi%401%2C2",
  outline: "f%5B%5D=panchang%40800",
} as const;

async function css(query: string, display = true): Promise<string> {
  const res = await fetch(`${API}?${query}${display ? "&display=swap" : ""}`, { cache: "force-cache" });
  if (!res.ok) throw new Error(`Fontshare API ${res.status}`);
  return (await res.text()).replace(/url\('\/\//g, "url('https://");
}

const firstWoff2 = (block: string) => block.match(/url\('(https:\/\/[^']+)'\)\s*format\('woff2'\)/)?.[1];

export type FontshareFaces = { css: string; preload: string[] };

/**
 * The @font-face rules to inline in <head>, and the two files the first screen needs (Panchang, upright Satoshi).
 * The static Extrabold is renamed "Panchang Outline": outline lettering (-webkit-text-stroke) needs it, because the
 * variable Panchang keeps overlapping contours that a stroke would draw inside the letters.
 */
export async function fontshareFaces(): Promise<FontshareFaces> {
  try {
    const [panchang, satoshi, outline] = await Promise.all([css(QUERIES.panchang), css(QUERIES.satoshi), css(QUERIES.outline)]);
    const outlineFaces = outline.replace(/font-family:\s*'Panchang'/g, "font-family: 'Panchang Outline'");
    const preload = [firstWoff2(panchang), firstWoff2(satoshi.split("@font-face")[1] ?? satoshi)].filter(
      (url): url is string => Boolean(url),
    );
    return { css: [panchang, satoshi, outlineFaces].join("\n"), preload };
  } catch {
    return { css: "", preload: [] };
  }
}

/** One TrueType file from the API, for the build-time Open Graph image (Satori reads TTF/OTF/WOFF, not WOFF2). */
export async function fontshareTtf(family: "panchang" | "satoshi", weight: number): Promise<ArrayBuffer | null> {
  try {
    const rules = await css(`f%5B%5D=${family}%40${weight}`, false);
    const url = rules.match(/url\('(https:\/\/[^']+)'\)\s*format\('truetype'\)/)?.[1];
    if (!url) return null;
    const res = await fetch(url, { cache: "force-cache" });
    return res.ok ? await res.arrayBuffer() : null;
  } catch {
    return null;
  }
}
