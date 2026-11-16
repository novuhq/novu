'use client';

import { motion } from 'motion/react';
import { type ReactNode, useEffect, useRef } from 'react';

import { cn } from '@/lib/utils';

/**
 * Which of the four steps a screen is (`Progress`): four 6px dots 6px apart, the current one an 18px orange bar
 * that slides along to the next step.
 */
export function ProgressDots({ current }: { current: 1 | 2 | 3 | 4 }) {
  return (
    <ol aria-label={`Step ${current} of 4`} className="flex h-1.5 items-center gap-1.5">
      {[1, 2, 3, 4].map((step) => (
        <li key={step} className="relative flex h-1.5 items-center">
          {step === current ? (
            <motion.span
              layoutId="say-hi-progress"
              className="block h-1.5 w-4.5 rounded-full bg-accent"
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            />
          ) : (
            <span className="block size-1.5 rounded-full bg-secondary" />
          )}
        </li>
      ))}
    </ol>
  );
}

/** A key a screen answers to: a letter, Enter, or the left and right arrows, drawn as the design's chevrons. */
export type HintKey = 'R' | 'C' | 'S' | 'enter' | 'left' | 'right';

/**
 * The keys a screen answers to (`Hints`), each a key cap and what it does: "↵ open inbox". Hidden on touch
 * screens.
 */
export function KeyHints({ hints }: { hints: ReadonlyArray<{ keys: HintKey[]; label: string }> }) {
  return (
    <ul aria-hidden="true" className="hidden items-center gap-4.5 [@media(hover:hover)]:flex">
      {hints.map(({ keys, label }) => (
        <li key={label} className="flex items-center gap-1.5 text-xs leading-4 text-muted">
          {keys.map((key) => (
            <Kbd key={key} name={key} />
          ))}
          <span>{label}</span>
        </li>
      ))}
    </ul>
  );
}

/** A key cap (`Kbd`): a dark face with a hairline of light along its top, standing on a hard 2px shadow. */
function Kbd({ name }: { name: HintKey }) {
  const wide = name === 'enter';

  return (
    <kbd
      className={cn(
        'relative mb-0.5 inline-flex h-5.5 shrink-0 items-center justify-center rounded-[5px] border border-[#33302b] bg-[#131210] font-mono text-[11px] font-medium text-[#ccc4b8] shadow-[0_2px_0_0_rgb(0_0_0/0.55)]',
        wide ? 'w-6.5' : 'w-5.5'
      )}
    >
      <span
        aria-hidden="true"
        className={cn('absolute top-0 left-1/2 h-px -translate-x-1/2 bg-white/6', wide ? 'w-4' : 'w-3')}
      />
      {name.length === 1 && name}
      {wide && (
        <svg viewBox="0 0 8.5 9.5" className="h-[9.5px] w-[8.5px] overflow-visible" fill="none" aria-hidden="true">
          <path
            d="M7.85.65v4.6a1.1 1.1 0 0 1-1.1 1.1H.9m2.2-2.2L.9 6.35l2.2 2.2"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {(name === 'left' || name === 'right') && (
        <svg viewBox="0 0 4 8" className="h-2 w-1 overflow-visible" fill="none" aria-hidden="true">
          <path
            d={name === 'left' ? 'M4 0 0 4l4 4' : 'M0 0l4 4-4 4'}
            stroke="currentColor"
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </kbd>
  );
}

/**
 * Runs `action` when `key` is pressed on the page: never while someone types in a field (unless `inFields`),
 * never with Cmd, Ctrl or Alt held, so the browser's own shortcuts keep working, and never for a key that presses
 * the button or link that has the focus, so the control a keyboard user picked is the one that runs.
 */
export function useShortcut(key: string, action: () => void, { enabled = true, inFields = false } = {}) {
  const latest = useRef(action);
  latest.current = action;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || event.defaultPrevented || event.repeat) {
        return;
      }
      if (event.key.toLowerCase() !== key.toLowerCase()) {
        return;
      }
      if (!inFields && isTyping(event.target)) {
        return;
      }
      if (PRESSING_KEYS.has(event.key) && isControl(event.target)) {
        return;
      }

      event.preventDefault();
      latest.current();
    };

    window.addEventListener('keydown', onKey);

    return () => window.removeEventListener('keydown', onKey);
  }, [key, enabled, inFields]);
}

/** The keys that press a focused button or follow a focused link. */
const PRESSING_KEYS = new Set(['Enter', ' ']);

function isControl(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    target.closest('button, a[href], summary, [role="button"], [role="link"], [role="menuitem"]') !== null
  );
}

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/** A screen's title: 26px in the design's medium weight, 24px on A.1 (pass the size in `className`). */
export function ScreenTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h1
      className={cn(
        'text-center text-[26px] leading-8 font-medium tracking-[-0.015em] text-balance text-foreground',
        className
      )}
    >
      {children}
    </h1>
  );
}

export function ScreenLead({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn('text-center text-sm leading-5 text-balance text-secondary', className)}>{children}</p>;
}

type ScreenSpaceProps = {
  /**
   * The room the design leaves above the screen and below it, down to the step dots, in its 1728×1052 frame. They
   * share out whatever room the window leaves in that proportion, so at the design's size the screen sits where the
   * design has it; on a window too short for the screen they close up and the page scrolls.
   */
  above: number;
  below: number;
  children: ReactNode;
  className?: string;
};

/** Places a screen in the onboarding's canvas, as high up as the design has it. */
export function ScreenSpace({ above, below, children, className }: ScreenSpaceProps) {
  return (
    <>
      <div aria-hidden="true" style={{ flex: `${above} 1 0px` }} />
      <div className={cn('flex w-full flex-col items-center px-4', className)}>{children}</div>
      <div aria-hidden="true" style={{ flex: `${below} 1 0px` }} />
    </>
  );
}
