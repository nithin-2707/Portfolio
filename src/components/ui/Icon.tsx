import Image from "next/image";
import type { CSSProperties } from "react";

/**
 * Brand / tool icons from /public/icons (thesvg.org).
 *
 *   <Icon name="react" size={20} />          full-colour /icons/react.svg
 *   <Icon name="react" size={20} mono />     /icons/react-mono.svg, tinted with currentColor
 *   <Icon name="aws" size={20} white />      /icons/aws-white.svg (night sections)
 *
 * Mono icons are drawn through a CSS mask, so they take the text colour of their
 * parent (ink on Rock Blue, paper on night) and never render as pure black.
 * Marks that ship without a mono file are masked from their colour file, which
 * yields a clean silhouette; Groq (white glyph on an orange tile) gets a knockout
 * tile built from its own glyph path.
 *
 * `size` is the rendered height in px. Width follows the mark's real viewBox ratio;
 * pass `maxWidth` to shrink wide wordmarks (Oracle, Forage) so a row stays even.
 * Decorative by default (aria-hidden); pass `label` when the icon carries meaning alone.
 */

/** viewBox width / height of each colour file (1 when square). */
const RATIO: Record<string, number> = {
  aws: 304 / 182,
  forage: 777 / 233,
  "framer-motion": 1103 / 386,
  gemini: 296 / 298,
  gmail: 512 / 399.42,
  html5: 452 / 520,
  "hugging-face": 95 / 88,
  java: 256 / 346,
  jest: 256 / 283,
  linux: 256 / 295,
  meta: 256 / 171,
  mongodb: 120 / 257,
  nodejs: 256 / 292,
  ollama: 646 / 854,
  openai: 256 / 260,
  oracle: 231 / 30,
  postgresql: 432.071 / 445.383,
  prisma: 256 / 310,
  react: 569 / 512,
  slack: 2447.6 / 2452.5,
  supabase: 109 / 113,
  "tailwind-css": 54 / 33,
  vercel: 256 / 222,
  vite: 48 / 46,
};

/** Marks that have a `<name>-mono.svg` file. All are 24x24 except framer-motion. */
const MONO_FILES = new Set([
  "aws", "css3", "docker", "express", "fastapi", "framer-motion", "gemini", "git", "github-actions", "github",
  "gmail", "gsap", "html5", "hugging-face", "infosys", "javascript", "jest", "jira", "linux", "meta", "mongodb",
  "nextjs", "nodejs", "ollama", "openai", "postgresql", "postman", "prisma", "python", "qwen", "react", "render",
  "supabase", "tailscale", "tailwind-css", "threejs", "typescript", "vercel", "vite", "vllm", "zendesk",
]);
const MONO_RATIO: Record<string, number> = { "framer-motion": 1103 / 386 };

/** Marks that have a `<name>-white.svg` file (their main file is the dark-ink version). */
const WHITE_FILES = new Set(["aws", "ollama", "openai", "prisma", "qwen", "threejs", "vercel"]);

/** Groq's glyph from groq.svg, punched out of the tile with even-odd so the mono mark keeps its "g". */
const GROQ_GLYPH =
  "m128 49 1.895 1.52C136.336 56.288 140.602 64.49 142 73c.097 1.823.148 3.648.161 5.474l.03 3.247.012 3.482.017 3.613c.01 2.522.016 5.044.02 7.565.01 3.84.041 7.68.072 11.521.007 2.455.012 4.91.016 7.364l.038 3.457c-.033 11.717-3.373 21.83-11.475 30.547-4.552 4.23-9.148 7.372-14.891 9.73l-2.387 1.055c-9.275 3.355-20.3 2.397-29.379-1.13-5.016-2.38-9.156-5.17-13.234-8.925 3.678-4.526 7.41-8.394 12-12l3.063 2.375c5.572 3.958 11.135 5.211 17.937 4.625 6.96-1.384 12.455-4.502 17-10 4.174-6.784 4.59-12.222 4.531-20.094l.012-3.473c.003-2.414-.005-4.827-.022-7.241-.02-3.68 0-7.36.026-11.04-.003-2.353-.008-4.705-.016-7.058l.025-3.312c-.098-7.996-1.732-13.21-6.681-19.47-6.786-5.458-13.105-8.211-21.914-7.792-7.327 1.188-13.278 4.7-17.777 10.601C75.472 72.012 73.86 78.07 75 85c2.191 7.547 5.019 13.948 12 18 5.848 3.061 10.892 3.523 17.438 3.688l2.794.103c2.256.082 4.512.147 6.768.209v16c-16.682.673-29.615.654-42.852-10.848-8.28-8.296-13.338-19.55-13.71-31.277.394-9.87 3.93-17.894 9.562-25.875l1.688-2.563C84.698 35.563 110.05 34.436 128 49Z";

const MASK_OVERRIDES: Record<string, string> = {
  groq: `url("data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 201 201'><path fill-rule='evenodd' d='M0 0h201v201H0z${GROQ_GLYPH}'/></svg>`,
  )}")`,
};

/** Aspect ratio (w/h) of the file the icon will actually draw. */
export function iconRatio(name: string, mono = false): number {
  if (mono && MONO_FILES.has(name)) return MONO_RATIO[name] ?? 1;
  return RATIO[name] ?? 1;
}

/** Public URL of the file drawn for `name` (colour unless `white` and a white file exists). */
export function iconSrc(name: string, opts: { mono?: boolean; white?: boolean } = {}): string {
  if (opts.mono && MONO_FILES.has(name)) return `/icons/${name}-mono.svg`;
  if (opts.white && WHITE_FILES.has(name)) return `/icons/${name}-white.svg`;
  return `/icons/${name}.svg`;
}

export type IconProps = {
  name: string;
  /** Rendered height in px. */
  size?: number;
  /** Tint with currentColor (mask). */
  mono?: boolean;
  /** Use the white variant on dark grounds when one exists. */
  white?: boolean;
  /** Cap the width (wordmarks); height shrinks to keep the ratio. */
  maxWidth?: number;
  /** Accessible name. Omit for decorative icons next to visible text. */
  label?: string;
  className?: string;
};

export function Icon({ name, size = 20, mono = false, white = false, maxWidth, label, className = "" }: IconProps) {
  const ratio = iconRatio(name, mono);
  let height = size;
  let width = size * ratio;
  if (maxWidth && width > maxWidth) {
    width = maxWidth;
    height = maxWidth / ratio;
  }
  width = Math.round(width * 100) / 100;
  height = Math.round(height * 100) / 100;

  const a11y = label ? ({ role: "img", "aria-label": label } as const) : ({ "aria-hidden": true } as const);

  if (mono) {
    const mask = MASK_OVERRIDES[name] ?? `url("${iconSrc(name, { mono: true })}")`;
    const style: CSSProperties = {
      width,
      height,
      backgroundColor: "currentColor",
      WebkitMaskImage: mask,
      maskImage: mask,
      WebkitMaskRepeat: "no-repeat",
      maskRepeat: "no-repeat",
      WebkitMaskPosition: "center",
      maskPosition: "center",
      WebkitMaskSize: "contain",
      maskSize: "contain",
    };
    return <span {...a11y} className={`inline-block shrink-0 ${className}`} style={style} />;
  }

  return (
    <Image
      src={iconSrc(name, { white })}
      alt={label ?? ""}
      aria-hidden={label ? undefined : true}
      width={Math.max(1, Math.round(width))}
      height={Math.max(1, Math.round(height))}
      unoptimized
      draggable={false}
      className={`inline-block shrink-0 select-none ${className}`}
      style={{ width, height }}
    />
  );
}
