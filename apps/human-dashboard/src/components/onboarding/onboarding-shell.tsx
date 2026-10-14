import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

import { DOCS_URL, FEEDBACK_URL } from '@/components/dashboard/nav';
import { Brand } from '@/components/site/brand';
import { ONBOARDING_STEPS, type OnboardingStep, STEP_LABELS } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

type OnboardingShellProps = {
  /** The right end of the top bar: who is signed in, or the way out of the steps. */
  aside: ReactNode;
  children: ReactNode;
};

/**
 * The onboarding's own full screen, outside the dashboard: the logo, one card in the middle, and the
 * credit, Docs and Help at the bottom. No sidebar and no top bar, so nothing changes under a refresh.
 */
export function OnboardingShell({ aside, children }: OnboardingShellProps) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-x-clip">
      <Pattern />
      {/*
        A set height. What stands at its right end changes with the step, and the button of steps 2 and 3
        is taller than the words of the others: a header that grew with it would shift the card below.
      */}
      <header className="flex h-16.5 shrink-0 items-center gap-4 px-4 md:px-10">
        <Brand />
        <div className="ml-auto flex min-w-0 items-center gap-4">{aside}</div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-10 md:px-10">{children}</main>
      <footer className="flex items-center gap-4 px-4 py-4.5 text-xs leading-4 text-muted md:px-10">
        <a
          href="https://novu.co/"
          className="rounded-sm font-mono text-[10px] leading-3.5 font-medium uppercase hover:text-secondary"
        >
          Built on Novu
        </a>
        <a href={DOCS_URL} target="_blank" rel="noreferrer" className="ml-auto rounded-sm hover:text-secondary">
          Docs
        </a>
        <a href={FEEDBACK_URL} className="rounded-sm hover:text-secondary">
          Help
        </a>
      </footer>
    </div>
  );
}

/**
 * `Pattern` in the design, drawn for a page 1728px wide: the orange dither in the top right corner and a
 * band of cream dots along the bottom. Both keep their size on a page of another width; the band stays
 * centered and repeats where the page is wider than it. Decoration only.
 */
function Pattern() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* `Deco/Callout dither` at 896x512 and 22%, 60px above the page and 40px past its right edge. */}
      <img
        src="/illustrations/dither-callout.svg"
        alt=""
        width={560}
        height={320}
        className="absolute -top-15 -right-10 h-128 w-224 max-w-none opacity-22 select-none"
      />
      {/*
        `Illustration/texture-band` at 2280x456 and 32%, turned upside down so its dots thicken towards
        the bottom, and 10px past the bottom edge.
      */}
      <div className="absolute inset-x-0 -bottom-2.5 h-114 -scale-y-100 bg-[url(/illustrations/texture-band.svg)] [background-size:2280px_456px] bg-top bg-repeat-x opacity-32" />
    </div>
  );
}

type SetupCardProps = {
  /** The right column: the agent's card as it stands on this step. */
  stage: ReactNode;
  children: ReactNode;
};

/**
 * The card in the middle (`Setup`): the step on the left, the agent's card on the right.
 *
 * It is as tall as its tallest step: the last one, once the host has read the message that waited for
 * it (722px where the card has its full width). The steps differ by up to 160px, and a card that
 * followed them would move itself and all that is on it up and down the page from one step to the next.
 */
export function SetupCard({ stage, children }: SetupCardProps) {
  return (
    <section className="flex w-full max-w-280 rounded-xl border border-border bg-background md:min-h-180.5">
      {/* Clipped, so a step that is taller than the last one shows only as far as the card has grown. */}
      <div className="flex min-w-0 flex-1 flex-col gap-5.5 overflow-hidden p-6 md:p-11">{children}</div>
      <div className="relative isolate hidden w-110 shrink-0 overflow-hidden rounded-r-[11px] border-l border-border lg:block">
        {stage}
      </div>
    </section>
  );
}

const CORNER_TICKS = [
  ['top-0 -left-1', '-top-1 left-0'],
  ['top-0 -right-1', '-top-1 right-0'],
  ['bottom-0 -left-1', '-bottom-1 left-0'],
  ['bottom-0 -right-1', '-bottom-1 right-0'],
];

/**
 * `Deco/Corner ticks` in the design: a hairline cross, 9px each way, centered on every corner of the box
 * it is dropped in. That box clips it, so what shows is the half of each cross that is inside: a small
 * angle in every corner that isn't rounded away.
 */
export function CornerTicks() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      {CORNER_TICKS.map(([across, down]) => (
        <span key={across} className="contents">
          <span className={cn('absolute h-px w-2.25 bg-border-strong', across)} />
          <span className={cn('absolute h-2.25 w-px bg-border-strong', down)} />
        </span>
      ))}
    </div>
  );
}

type StepRailProps = {
  current: OnboardingStep;
  /** The step on show has done its job and waits for the operator to move on: it is drawn as finished. */
  currentDone?: boolean;
  /**
   * The step before this one was drawn as finished while it was still on show. Its bar is full already,
   * so this step has nothing to wait for and takes over at once.
   */
  previousDone?: boolean;
};

/** How a step is drawn: finished, the one in hand, or still to come. */
function stateOf(index: number, currentIndex: number, currentDone: boolean): 'done' | 'active' | 'ahead' {
  if (index < currentIndex) return 'done';
  if (index > currentIndex) return 'ahead';

  return currentDone ? 'done' : 'active';
}

/**
 * A step takes its turn: it lights up and starts its bar once the step before it has filled its own,
 * which takes this long, and not alongside it. The wait goes with the look of the step in hand only, so
 * a step that finishes starts filling its bar at once.
 */
const AFTER_THE_FILL = 'delay-500';

/** The four steps across the top of the card, with a bar under each that fills as the setup moves on. */
export function StepRail({ current, currentDone = false, previousDone = false }: StepRailProps) {
  const currentIndex = ONBOARDING_STEPS.indexOf(current);
  const turn = previousDone ? undefined : AFTER_THE_FILL;

  return (
    <ol className="flex gap-1.5">
      {ONBOARDING_STEPS.map((step, index) => {
        const state = stateOf(index, currentIndex, currentDone);
        const done = state === 'done';
        const active = state === 'active';

        return (
          <li
            key={step}
            aria-current={index === currentIndex ? 'step' : undefined}
            className="flex w-24.25 flex-col gap-2"
          >
            <span className="flex items-center gap-1.5 text-xs leading-4">
              {/* The number gives way to a check mark, and its place narrows to the mark's width. */}
              <span
                aria-hidden="true"
                className={cn(
                  'relative h-3.5 shrink-0 font-mono text-[11px] leading-3.5 font-medium transition-[width] duration-300 ease-out motion-reduce:transition-none',
                  done ? 'w-2.5' : 'w-[2ch]'
                )}
              >
                <span
                  className={cn(
                    'absolute inset-0 transition-[opacity,color] duration-300 motion-reduce:transition-none',
                    active ? ['text-accent', turn] : 'text-muted',
                    done && 'opacity-0'
                  )}
                >
                  {String(index + 1).padStart(2, '0')}
                </span>
                <Check
                  className={cn(
                    'absolute top-0.5 left-0 size-2.5 text-success transition-[opacity,scale] duration-300 ease-out motion-reduce:transition-none',
                    !done && 'scale-50 opacity-0'
                  )}
                  strokeWidth={3}
                />
              </span>
              <span
                className={cn(
                  'transition-[color,font-weight] duration-300 motion-reduce:transition-none',
                  active && ['font-medium', turn],
                  done || active ? 'text-foreground' : 'text-muted'
                )}
              >
                {STEP_LABELS[step]}
              </span>
              {done && <span className="sr-only">(done)</span>}
            </span>
            <span className="h-0.75 overflow-hidden rounded-xs bg-surface">
              <span
                className={cn(
                  'block h-full rounded-xs transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none',
                  done ? 'w-full bg-success' : active ? ['w-8 bg-accent', turn] : 'w-0 bg-accent'
                )}
              />
            </span>
          </li>
        );
      })}
    </ol>
  );
}

type EyebrowProps = {
  /** Green for something that went well, orange for something that waits. */
  tone: 'success' | 'accent';
  children: ReactNode;
};

/** The small status line above a step's title: "ADDRESS LIVE", "CONNECTED". */
export function Eyebrow({ tone, children }: EyebrowProps) {
  return (
    <p
      className={cn(
        'flex items-center gap-2 font-mono text-[11px] leading-4 font-medium tracking-[0.66px] uppercase',
        tone === 'success' ? 'text-success' : 'text-accent'
      )}
    >
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current" />
      {children}
    </p>
  );
}

/** A step's title. Wrap the word that carries it in `<em>` for the serif accent. */
export function StepTitle({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-[28px] leading-12 tracking-[-0.8px] text-foreground [&>em]:font-display [&>em]:text-accent">
      {children}
    </h1>
  );
}

export function StepLead({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-5.75 text-secondary">{children}</p>;
}
