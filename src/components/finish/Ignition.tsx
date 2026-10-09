"use client";

import { useRef, useState, type ReactNode } from "react";
import { person } from "@/content/site";
import { prefersReducedMotion } from "@/lib/useReducedMotion";
import HoldButton from "./HoldButton";
import { RouteUnderline } from "./RouteUnderline";

type Status = "idle" | "copied" | "blocked";

const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";

function ArrowRight() {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" focusable="false" className="ml-1 inline-block size-[0.95em] align-[-0.12em]">
      <path d="M2.5 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M8.5 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MailLink() {
  return (
    <a href={`mailto:${person.email}`} className="group/road relative inline-block pb-0.5 font-semibold whitespace-nowrap">
      Open mail app
      <ArrowRight />
      <RouteUnderline />
    </a>
  );
}

/**
 * The push-to-start ignition. A press copies the email straight away: the label blurs to COPIED and the line
 * below confirms it. Holding for the full 1.2 s is the flourish: the rev arc fills, the contour rings tighten,
 * the engine "catches" (a ring echoes out) and the email lands on the clipboard the same way.
 * Clipboard writes happen inside a user-activation event: a press copies inside the release that ends it (on
 * phones lifting the finger is the activation); a hold copies when it completes (desktop: the press is still a
 * fresh activation) and, if that was refused, again inside the release. Keyboard Enter/Space work the same way.
 * The email is always printed beside it as a plain mailto link, so nothing is hidden behind the gimmick.
 */
export function Ignition({ rings }: { rings?: ReactNode }) {
  const [status, setStatus] = useState<Status>("idle");
  const [stamp, setStamp] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const echoRef = useRef<HTMLSpanElement>(null);
  const copy = useRef({ copied: false, committed: false, inflight: 0 });

  const say = (next: Status) => {
    setStatus(next);
    setStamp((n) => n + 1);
  };

  const attempt = () => {
    const c = copy.current;
    const clipboard = navigator.clipboard;
    if (!clipboard?.writeText) {
      if (c.committed && !c.copied) say("blocked");
      return;
    }
    c.inflight += 1;
    clipboard.writeText(person.email).then(
      () => {
        c.inflight -= 1;
        if (c.copied) return;
        c.copied = true;
        say("copied");
      },
      () => {
        c.inflight -= 1;
        if (!c.copied && c.committed && c.inflight === 0) say("blocked");
      },
    );
  };

  /** A press (not a full hold): copy now, inside the release event that ended it. */
  const onTap = () => {
    copy.current = { copied: false, committed: true, inflight: 0 };
    setStatus("idle");
    attempt();
  };

  const onHold = () => {
    copy.current = { copied: false, committed: false, inflight: 0 };
    setStatus("idle");
    attempt();
    if (!prefersReducedMotion()) {
      echoRef.current?.animate(
        [
          { transform: "scale(1)", opacity: 0.55 },
          { transform: "scale(1.6)", opacity: 0 },
        ],
        { duration: 760, easing: EASE_OUT },
      );
    }
  };

  const onCommit = () => {
    const c = copy.current;
    c.committed = true;
    if (!c.copied) attempt();
  };

  const onProgress = (p: number) => {
    const el = rootRef.current;
    if (!el) return;
    const v = p.toFixed(3);
    el.style.setProperty("--ign", v);
    if (!prefersReducedMotion()) el.style.setProperty("--ign-s", v);
  };

  const fx = "block transition-[opacity,filter] duration-200 ease-out starting:opacity-0 starting:blur-[2px]";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative isolate inline-grid place-items-center">
        {rings}
        <div className="relative grid place-items-center">
          <span
            ref={echoRef}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full border-2 border-ink opacity-0"
          />
          <HoldButton
            holdTime={1200}
            releaseTime={220}
            resetAfter={2600}
            hint="Copies my email address. A press is enough; hold for 1.2 seconds to start the engine."
            doneLabel={status === "blocked" ? "Not copied" : "Copied"}
            onHold={onHold}
            onCommit={onCommit}
            onTap={onTap}
            onProgress={onProgress}
          >
            <span className="block">Hold</span>{" "}
            <span className="block">to start</span>
          </HoldButton>
        </div>
      </div>

      <p className="mt-6 text-[0.9375rem] font-medium">Press to copy my email.</p>
      <p className="mt-2 text-[1.125rem] leading-snug font-medium">
        <a
          href={`mailto:${person.email}`}
          className="group/road inline-flex min-h-11 max-w-full items-center transition-transform duration-150 ease-out active:scale-[0.97]"
        >
          <span className="relative min-w-0 pb-1 [overflow-wrap:anywhere]">
            {person.email}
            <RouteUnderline />
          </span>
        </a>
      </p>

      <p aria-live="polite" className="mt-2 min-h-[3rem] max-w-[34ch] text-[0.9375rem] leading-[1.5]">
        {status === "copied" ? (
          <span key={stamp} className={fx}>
            <span aria-hidden="true">On your clipboard</span>
            <span className="sr-only">{person.email} is on your clipboard.</span>
            <span aria-hidden="true" className="mx-[0.45em] text-night/70">
              ·
            </span>
            <MailLink />
          </span>
        ) : null}
        {status === "blocked" ? (
          <span key={stamp} className={fx}>
            Your browser kept the clipboard closed
            <span aria-hidden="true" className="mx-[0.45em] text-night/70">
              ·
            </span>
            <MailLink />
          </span>
        ) : null}
      </p>
    </div>
  );
}
