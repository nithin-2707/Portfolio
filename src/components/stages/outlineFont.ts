/**
 * Static Panchang Extrabold, used ONLY for outline lettering (-webkit-text-stroke): the stage codes (SS1…), the
 * service-bay numbers and the footer marquee.
 *
 * Why a second cut: the variable Panchang keeps overlapping contours in several glyphs ("1", "5", "A" are built from
 * overlapping shapes). A text stroke outlines every contour, so those overlaps would show as stray lines inside the
 * letters. The static Extrabold has the overlaps removed. It is served from Fontshare as "Panchang Outline"
 * (lib/fontshare.ts); the `.font-outline` class in globals.css applies it.
 */
export const outlineFont = { className: "font-outline" } as const;
