"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { gears, type Gear } from "@/content/site";
import { Icon } from "@/components/ui/Icon";
import { useReducedMotion } from "@/lib/useReducedMotion";

/**
 * The read-out next to the gate. When the gear changes, what is on screen leaves with a quick
 * blur-fade (120 ms) and the new group arrives item by item (35 ms apart, from 8 px below).
 * Neutral shows every gear as a compact index laid out like the H itself.
 */
export function GearPanel({ gear, onSelect, id }: { gear: number | null; onSelect: (gear: number) => void; id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState<number | null>(gear);
  const swapped = useRef(false);
  const mounted = useRef(false);
  const reduced = useReducedMotion();

  // Exit: the requested gear differs from what is on screen.
  useGSAP(
    () => {
      const targets = gsap.utils.toArray<HTMLElement>("[data-swap]", ref.current);
      if (gear === shown) {
        if (!mounted.current) {
          mounted.current = true;
          return;
        }
        // a shift was reversed before the swap happened: bring the current content straight back
        gsap.to(targets, { autoAlpha: 1, filter: "blur(0px)", y: 0, duration: 0.16, ease: "road", overwrite: true, clearProps: "filter,transform" });
        return;
      }
      gsap.to(targets, {
        startAt: { filter: "blur(0px)" },
        autoAlpha: 0,
        filter: "blur(4px)",
        duration: 0.12,
        ease: "road",
        overwrite: true,
        onComplete: () => {
          swapped.current = true;
          setShown(gear);
        },
      });
    },
    { scope: ref, dependencies: [gear] },
  );

  // Enter: new content is in the DOM.
  useGSAP(
    () => {
      if (!swapped.current) return;
      const targets = gsap.utils.toArray<HTMLElement>("[data-swap]", ref.current);
      gsap.fromTo(
        targets,
        { autoAlpha: 0, y: reduced ? 0 : 8, filter: "blur(4px)" },
        { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.34, ease: "road", stagger: 0.035, overwrite: true, clearProps: "filter,transform" },
      );
    },
    { scope: ref, dependencies: [shown] },
  );

  const group = shown === null ? null : gears[shown - 1];

  return (
    <div ref={ref} id={id} className="relative min-h-[14rem] md:min-h-[17rem] lg:min-h-[20rem]">
      {group ? <GroupView group={group} /> : <NeutralIndex onSelect={onSelect} />}
    </div>
  );
}

/**
 * Marks printed in full colour on the paper. Each one's main brand colour holds about 3:1 or more on
 * Merino (measured from the SVG fills), and none is an orange that would read as the route.
 * Every other mark is printed in ink through its mono file:
 *  - pale marks: JavaScript and Hugging Face yellow, React and Tailwind cyan, GSAP and MongoDB green,
 *    vLLM, and Linux's Tux (all 1.2–1.9:1);
 *  - route-orange marks: HTML5, Groq, Postman;
 *  - single-colour black marks: Next.js, Express, Prisma, Ollama, OpenAI, Vercel, GitHub.
 *    In ink they never print pure #000.
 */
const COLOUR_ON_PAPER = new Set([
  "python",
  "typescript",
  "java",
  "nodejs",
  "fastapi",
  "postgresql",
  "gemini",
  "azure",
  "aws",
  "github-actions",
  "jest",
]);

function ItemIcon({ name }: { name: string }) {
  if (COLOUR_ON_PAPER.has(name)) return <Icon name={name} size={24} maxWidth={32} />;
  return <Icon name={name} size={24} mono />;
}

function GroupView({ group }: { group: Gear }) {
  return (
    <div>
      <h3 data-swap className="font-display text-[clamp(2rem,3.6vw,3.2rem)] font-[700] leading-[0.98] tracking-[-0.03em] text-ink">
        {group.name}
      </h3>
      <p data-swap className="mt-3 text-[1.125rem] text-ink/80">
        {group.note}
      </p>
      <ul className="mt-8 flex list-none flex-wrap gap-x-8 gap-y-5 border-t border-ink/25 p-0 pt-7">
        {group.items.map((item) => (
          <li key={item.name} data-swap className="flex items-center gap-3 text-[clamp(1.0625rem,1.3vw,1.1875rem)] font-medium leading-tight text-ink">
            {item.icon ? <ItemIcon name={item.icon} /> : <SurveyMark />}
            {item.name}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Map benchmark symbol for skills that have no brand mark (SQL, code review, ...). */
function SurveyMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 22 22" className="size-6 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="7.25" />
      <circle cx="11" cy="11" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function NeutralIndex({ onSelect }: { onSelect: (gear: number) => void }) {
  return (
    <div>
      <h3 data-swap className="font-display text-[clamp(2rem,3.6vw,3.2rem)] font-[700] leading-[0.98] tracking-[-0.03em] text-ink">
        Neutral
      </h3>
      <p data-swap className="mt-3 text-[1.125rem] text-ink/80">
        All six gears. Pick one to engage it.
      </p>
      {/* column-major, so the index reads like the gate: 1 over 2, 3 over 4, 5 over 6 */}
      <ol className="mt-8 grid list-none grid-flow-col grid-cols-3 grid-rows-2 gap-x-4 gap-y-2 border-t border-ink/25 p-0 pt-6">
        {gears.map((g) => (
          <li key={g.gear} data-swap>
            <button
              type="button"
              onClick={() => onSelect(Number(g.gear))}
              className="group/idx flex min-h-11 w-full items-baseline gap-2.5 rounded-md py-2 text-left text-ink transition-[scale] duration-150 ease-out active:scale-[0.97]"
            >
              <span className="sr-only">Gear </span>
              <span className="relative font-display text-[1.35rem] font-[700] leading-none">
                {g.gear}
                {/* the gate's engaged-gear bar, previewed on hover */}
                <span
                  aria-hidden="true"
                  className="absolute -bottom-2 left-1/2 h-[3px] w-4 -translate-x-1/2 scale-x-50 rounded-full bg-route opacity-0 transition-[opacity,scale] duration-200 ease-out group-hover/idx:scale-x-100 group-hover/idx:opacity-100 group-focus-visible/idx:scale-x-100 group-focus-visible/idx:opacity-100"
                />
              </span>
              <span className="text-[0.95rem] font-medium leading-tight">{g.name}</span>
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
