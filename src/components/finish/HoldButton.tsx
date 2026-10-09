"use client";

// Adapted from React Bits HoldButton (reactbits.dev, MIT + Commons Clause), re-skinned as the Finish
// section's push-to-start ignition. Kept from upstream: the hold state machine, pointer capture, keyboard
// Space/Enter hold (Escape cancels), cancel on drift past a 10px pad, window blur or tab hide, the rAF-driven
// progress written to --hb-p, and the screen-reader hint.
// Changed:
//  - Visual: a round ink button with a thin paper rev arc (270°) whose stroke-dashoffset follows --hb-p; the
//    arc turns route orange once the engine "catches". The clip-path fill, wave crest and glow are gone.
//  - A press is enough: any press released before the hold completes (and not dragged off or cancelled) fires
//    onTap inside that release event and puts the button in its done state, like a completed hold. Holding to
//    the end is the flourish. Clicks from assistive tech (no pointer or key press behind them) count as a press.
//  - onCommit: fired synchronously inside the release event (pointerup / keyup) that follows a completed hold.
//    On phones the finger is still down when the hold completes, so the page has no user activation yet; the
//    release is what grants it, so clipboard writes belong there.
//  - onProgress mirrors the hold progress to the parent (it tightens the contour rings around the button).
//  - React Compiler safe: no ref writes during render; window listeners use useEffectEvent.

import {
  useEffect,
  useEffectEvent,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

type Phase = "idle" | "holding" | "done";
type Input = "pointer" | "key" | null;

export interface HoldButtonProps {
  /** idle label */
  children: ReactNode;
  /** label once the hold completes */
  doneLabel: ReactNode;
  /** ms the press must last */
  holdTime?: number;
  /** ms the arc takes to fall back after an early release */
  releaseTime?: number;
  /** ms after completion before the button returns to idle (0 = stay done) */
  resetAfter?: number;
  /** screen-reader description of the gesture */
  hint?: string;
  /** the hold completed (fired from the animation frame that completes it) */
  onHold?: () => void;
  /** the release that follows a completed hold (a user-activation event) */
  onCommit?: () => void;
  /** a press released before the hold completed, fired inside that release event */
  onTap?: () => void;
  onProgress?: (progress: number) => void;
  className?: string;
}

const HIT_PAD = 10;
const LINEAR = (t: number) => t;
const EASE_OUT = (t: number) => 1 - Math.pow(1 - t, 3);

export default function HoldButton({
  children,
  doneLabel,
  holdTime = 1200,
  releaseTime = 220,
  resetAfter = 2600,
  hint,
  onHold,
  onCommit,
  onTap,
  onProgress,
  className = "",
}: HoldButtonProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [input, setInput] = useState<Input>(null);
  const phaseRef = useRef<Phase>("idle");
  const inputRef = useRef<Input>(null);
  const armed = useRef(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ pointerId: number | null; start: number; rect: DOMRect | null }>({
    pointerId: null,
    start: 0,
    rect: null,
  });
  const timers = useRef({ complete: 0, reset: 0 });
  const motion = useRef({ raf: 0, p: 0, from: 0, to: 0, start: 0 });
  const hintId = useId();

  const go = (next: Phase, kind: Input = null) => {
    phaseRef.current = next;
    inputRef.current = kind;
    setPhase(next);
    setInput(kind);
  };

  const clearTimers = () => {
    window.clearTimeout(timers.current.complete);
    window.clearTimeout(timers.current.reset);
  };

  const drive = (to: number, duration: number, ease: (t: number) => number) => {
    const m = motion.current;
    cancelAnimationFrame(m.raf);
    m.from = m.p;
    m.to = to;
    m.start = -1; // stamped by the first frame, so the arc always starts from where it is
    const step = (now: number) => {
      if (m.start < 0) m.start = now;
      const t = duration > 0 ? Math.min(1, (now - m.start) / duration) : 1;
      m.p = m.from + (m.to - m.from) * ease(t);
      buttonRef.current?.style.setProperty("--hb-p", m.p.toFixed(4));
      onProgress?.(m.p);
      if (t < 1) {
        m.raf = requestAnimationFrame(step);
        return;
      }
      m.raf = 0;
      if (m.to === 1) complete(now);
    };
    m.raf = requestAnimationFrame(step);
  };

  /** Show the done label, then fall back to idle after resetAfter. */
  const settle = () => {
    go("done", inputRef.current);
    if (resetAfter > 0) {
      timers.current.reset = window.setTimeout(() => {
        armed.current = false;
        go("idle");
        drive(0, releaseTime * 2, EASE_OUT);
      }, resetAfter);
    }
  };

  const complete = (now: number) => {
    if (phaseRef.current !== "holding") return;
    if (now - gesture.current.start < holdTime - 50) return;
    clearTimers();
    armed.current = true;
    settle();
    onHold?.();
  };

  const begin = (kind: Input) => {
    if (phaseRef.current !== "idle") return false;
    const button = buttonRef.current;
    if (!button) return false;
    gesture.current.start = performance.now();
    gesture.current.rect = button.getBoundingClientRect();
    go("holding", kind);
    drive(1, holdTime, LINEAR);
    // safety net if frames are throttled (background tab, low-power mode)
    timers.current.complete = window.setTimeout(() => complete(performance.now()), holdTime + 100);
    return true;
  };

  /** End of a press. If the hold had completed, this is the commit (and it runs inside the release event). */
  const release = ({ drifted = false }: { drifted?: boolean } = {}) => {
    if (armed.current) {
      armed.current = false;
      onCommit?.();
      return;
    }
    if (phaseRef.current !== "holding") return;
    clearTimers();
    drive(0, releaseTime, EASE_OUT);
    if (drifted) {
      go("idle");
      return;
    }
    // released early: a press, not a hold. It still does the job, without the flourish.
    onTap?.();
    settle();
  };

  // A click with no pointer or key press behind it (detail 0: a screen reader's activate, voice control) is a
  // press too. Real pointer and keyboard clicks are handled by the press itself (Enter/Space are prevented).
  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (e.detail !== 0 || phaseRef.current !== "idle" || gesture.current.pointerId !== null) return;
    onTap?.();
    settle();
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0 || !e.isPrimary || gesture.current.pointerId !== null) return;
    if (!begin("pointer")) return;
    gesture.current.pointerId = e.pointerId;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; the hold still works without it */
    }
  };

  const endPointer = (e: ReactPointerEvent<HTMLButtonElement>, drifted = false) => {
    if (e.pointerId !== gesture.current.pointerId) return;
    gesture.current.pointerId = null;
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    release({ drifted });
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLButtonElement>) => {
    if (e.pointerId !== gesture.current.pointerId || phaseRef.current !== "holding") return;
    const r = gesture.current.rect;
    if (!r) return;
    const out =
      e.clientX < r.left - HIT_PAD ||
      e.clientX > r.right + HIT_PAD ||
      e.clientY < r.top - HIT_PAD ||
      e.clientY > r.bottom + HIT_PAD;
    if (out) endPointer(e, true);
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "Escape") {
      if (inputRef.current === "key" && phaseRef.current === "holding") release({ drifted: true });
      return;
    }
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) begin("key");
    }
  };

  const handleKeyUp = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (inputRef.current === "key" || armed.current) release();
    }
  };

  // Leaving the window or tab mid-hold cancels it, like upstream.
  const cancelHold = useEffectEvent(() => {
    if (phaseRef.current === "holding") release({ drifted: true });
  });

  useEffect(() => {
    if (phase !== "holding") return undefined;
    const onVisibility = () => {
      if (document.hidden) cancelHold();
    };
    const onBlur = () => cancelHold();
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [phase]);

  useEffect(() => {
    const t = timers.current;
    const m = motion.current;
    return () => {
      window.clearTimeout(t.complete);
      window.clearTimeout(t.reset);
      cancelAnimationFrame(m.raf);
    };
  }, []);

  const label =
    "[grid-area:1/1] transition-[opacity,filter] duration-200 ease-out motion-reduce:transition-opacity";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-cursor-label="Hold"
        aria-label="Hold to start: copies my email address"
        data-phase={phase}
        data-input={input ?? undefined}
        aria-describedby={hint ? hintId : undefined}
        style={{ "--hb-p": 0 } as CSSProperties}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => endPointer(e)}
        onPointerCancel={(e) => endPointer(e, true)}
        onLostPointerCapture={(e) => endPointer(e, true)}
        onPointerLeave={(e) => {
          if (e.pointerType !== "touch") endPointer(e, true);
        }}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onClick={handleClick}
        onContextMenu={(e) => e.preventDefault()}
        className={`group relative grid size-[8.25rem] shrink-0 cursor-pointer touch-manipulation select-none place-items-center rounded-full! bg-ink text-paper outline-offset-4 transition-transform duration-150 ease-out [-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none] active:scale-[0.97] data-[phase=holding]:scale-[0.97] motion-reduce:transition-none ${className}`}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className="pointer-events-none absolute inset-[7px]">
          {/* the gauge: a 270° arc open at the bottom */}
          <circle
            cx="50"
            cy="50"
            r="46"
            pathLength={100}
            transform="rotate(135 50 50)"
            className="fill-none stroke-paper/25 transition-[stroke] duration-200 group-hover:stroke-paper/45"
            strokeWidth={1.4}
            strokeLinecap="round"
            strokeDasharray="75 100"
          />
          {/* the rev arc: its dash offset follows the hold progress */}
          <circle
            cx="50"
            cy="50"
            r="46"
            pathLength={100}
            transform="rotate(135 50 50)"
            className="fill-none stroke-paper transition-[stroke] duration-300 group-data-[phase=done]:stroke-route"
            strokeWidth={2.2}
            strokeLinecap="round"
            strokeDasharray="75 100"
            style={{ strokeDashoffset: "calc((1 - var(--hb-p)) * 75px)" }}
          />
        </svg>
        <span className="relative grid place-items-center font-display text-[0.6875rem] leading-[1.35] font-semibold tracking-[0.08em] uppercase">
          <span
            aria-hidden={phase === "done"}
            className={`${label} grid place-items-center group-data-[phase=done]:opacity-0 group-data-[phase=done]:blur-[2px]`}
          >
            {children}
          </span>
          <span
            aria-hidden={phase !== "done"}
            className={`${label} opacity-0 blur-[2px] group-data-[phase=done]:opacity-100 group-data-[phase=done]:blur-none`}
          >
            {doneLabel}
          </span>
        </span>
      </button>
      {/* outside the button, so it describes the control without becoming part of its name */}
      {hint ? (
        <span id={hintId} className="sr-only">
          {hint}
        </span>
      ) : null}
    </>
  );
}
