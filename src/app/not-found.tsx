import type { Metadata } from "next";
import Link from "next/link";
import { ClearLoading } from "@/components/offroute/ClearLoading";

export const metadata: Metadata = {
  title: "Off route",
  robots: { index: false, follow: true },
};

/** A roadbook U-turn: entry dot, approach, the turn, and the arrow heading back the way you came. */
function UTurn() {
  return (
    <svg viewBox="0 0 120 160" aria-hidden="true" focusable="false" className="h-40 w-auto">
      <circle cx="40" cy="146" r="6" className="fill-ink" />
      <path d="M40 140V62a20 20 0 0 1 40 0v64" fill="none" className="stroke-route" strokeWidth="7" strokeLinecap="round" />
      <path d="M66 112l14 18 14-18" fill="none" className="stroke-route" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 62H14M66 42V18" fill="none" className="stroke-ink" strokeOpacity="0.35" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export default function NotFound() {
  return (
    <main className="relative grid min-h-[100dvh] place-items-center bg-paper px-[var(--gutter)] py-16 text-ink">
      <ClearLoading />
      <div className="grid w-full max-w-[56rem] items-center gap-12 md:grid-cols-[auto_1fr]">
        <UTurn />
        <div>
          <h1 className="t-display text-[clamp(2.6rem,7vw,5rem)] text-ink">Off route.</h1>
          <p className="mt-6 max-w-[38ch] text-[1.15rem] leading-relaxed text-ink/80">
            This page is not on the map. Make a U-turn and pick the route up from the start.
          </p>
          <Link
            href="/"
            className="mt-9 inline-flex h-12 items-center gap-3 rounded-full bg-ink px-6 text-[0.95rem] font-semibold text-paper transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97]"
          >
            Back to the start
            <span aria-hidden="true" className="inline-block size-1.5 rounded-full bg-route" />
          </Link>
          <p className="t-map mt-8 text-venice">Error 404</p>
        </div>
      </div>
    </main>
  );
}
