import type { CSSProperties } from "react";

/**
 * The atlas linework in `public/textures/contours.svg` is alpha only (minor contours at 0.42, index contours
 * at 0.6). It is used as a mask over a Rock-filled box, so the lines always print in the live Rock token.
 */
export function contourTexture(size: string, position: string): CSSProperties {
  const image = "url('/textures/contours.svg')";
  return {
    maskImage: image,
    WebkitMaskImage: image,
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
  };
}
