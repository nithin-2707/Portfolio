/**
 * Licences' button language: a small stamp-style tab. Dashed 1px border at rest; on hover or
 * keyboard focus it tilts to -2deg and the border solidifies, like a stamp pressed onto the sheet.
 * `hidden` is for the decorative read-out copy (the list holds the reachable link).
 */
export function VerifyTab({ href, name, hidden = false }: { href: string; name: string; hidden?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      tabIndex={hidden ? -1 : undefined}
      className="group/verify inline-flex min-h-11 shrink-0 items-center transition-[scale] duration-150 ease-out active:scale-[0.97]"
    >
      <span
        data-stamp
        className="relative inline-flex items-center gap-1.5 border border-dashed border-paper/60 px-3 py-[7px] text-[11.5px] font-semibold uppercase leading-none tracking-[0.14em] text-paper transition-[rotate,background-color,border-color] duration-200 ease-out group-hover/verify:rotate-[-2deg] group-hover/verify:border-solid group-hover/verify:border-paper group-hover/verify:bg-paper/10 group-focus-visible/verify:rotate-[-2deg] group-focus-visible/verify:border-solid group-focus-visible/verify:border-paper group-focus-visible/verify:bg-paper/10"
      >
        Verify
        <svg aria-hidden="true" viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9 9 3M4.5 3H9v4.5" />
        </svg>
      </span>
      {!hidden && <span className="sr-only">: {name} (opens in a new tab)</span>}
    </a>
  );
}
