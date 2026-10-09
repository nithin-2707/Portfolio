/**
 * The Finish section's link underline: a 2px night-ink road under the text (the section itself is route orange). On hover or keyboard focus it
 * runs off to the right, then redraws from the left. Place it inside a `relative` box, under an ancestor with the
 * `group/road` class (the link itself). Reduced motion: both halves switch instantly, so the line simply stays.
 */
export function RouteUnderline() {
  return (
    <>
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-right bg-night transition-transform duration-200 ease-in-out group-hover/road:scale-x-0 group-focus-visible/road:scale-x-0 motion-reduce:transition-none"
      />
      <span
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-night transition-transform duration-300 ease-out group-hover/road:scale-x-100 group-hover/road:delay-150 group-focus-visible/road:scale-x-100 group-focus-visible/road:delay-150 motion-reduce:transition-none"
      />
    </>
  );
}
