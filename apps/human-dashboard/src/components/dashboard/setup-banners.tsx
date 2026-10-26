import Link from 'next/link';

import { dismissDoneBannerAction } from '@/app/(account)/onboarding/actions';
import { FoldAwayButton, FoldsAway } from '@/components/dashboard/folds-away';
import { DASHBOARD_HOME } from '@/components/dashboard/nav';
import { buttonClassName, SMALL_BUTTON } from '@/components/ui/button';
import { MascotFace } from '@/components/ui/mascot-face';
import { ONBOARDING_PATH, ONBOARDING_STEPS, type OnboardingStep } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

type UnfinishedSetup = {
  /** What the agent is called in a sentence: its address without the domain. */
  handle: string;
  /** The step "Continue setup" opens. */
  step: 'test' | 'connect';
  /** Messages in the inbox that no host has read yet. */
  waiting: number;
};

/** "1 message is waiting", in whatever sentence needs it. Empty when none is. */
function describeWaiting(waiting: number, verb: (plural: boolean) => string): string {
  return waiting > 0 ? `${waiting} ${waiting === 1 ? 'message' : 'messages'} ${verb(waiting !== 1)}` : '';
}

/**
 * The line across the top of the Inbox page while no host reads the agent's mail: the operator left the
 * onboarding before a host connected, and this is the way back to the step they left.
 */
export function SetupNotFinishedBanner({ handle, waiting }: UnfinishedSetup) {
  const waitingNote = describeWaiting(waiting, (plural) => (plural ? 'are waiting.' : 'is waiting.'));

  return (
    <section className="flex animate-rise-in flex-wrap items-center gap-x-2.5 gap-y-2 rounded-lg border border-warning/30 bg-warning/6 px-3.5 py-2.5 text-[13px] leading-4.5 motion-reduce:animate-none">
      <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-warning" />
      <h2 className="font-medium text-foreground">{handle} isn’t connected to an agent yet.</h2>
      {waitingNote && <p className="text-secondary">{waitingNote}</p>}
      <Link href={ONBOARDING_PATH} className={buttonClassName('secondary', cn(SMALL_BUTTON, 'ml-auto'))}>
        Continue setup
      </Link>
    </section>
  );
}

/** What is left to do on each step the operator can come back to. Only step 3 is drawn in the design. */
function describeNextStep({ handle, step, waiting }: UnfinishedSetup): { title: string; description: string } {
  if (step === 'test') {
    return {
      title: `Try ${handle}’s address`,
      description: 'Email the address, or send a test email, then connect your agent.',
    };
  }

  const waitingNote = describeWaiting(waiting, () => 'waiting for it.');

  return {
    title: 'Connect your agent',
    description: `Paste one prompt into your agent.${waitingNote ? ` ${handle} has ${waitingNote}` : ''}`,
  };
}

/** The card across the top of the Configure page for the same unfinished setup, with how far it got. */
export function ResumeSetupCard(setup: UnfinishedSetup) {
  const stepIndex = ONBOARDING_STEPS.indexOf(setup.step);
  const { title, description } = describeNextStep(setup);

  return (
    <section className="flex animate-rise-in flex-col gap-3 rounded-[10px] border border-accent/35 bg-subtle px-4.5 py-4 motion-reduce:animate-none">
      <div className="flex items-center gap-2.5 font-mono">
        <p className="text-[10px] leading-3.5 font-medium text-accent uppercase">Finish setup</p>
        <p className="text-[11px] leading-3.5 text-muted">
          step {stepIndex + 1} of {ONBOARDING_STEPS.length}
        </p>
        <StepBars current={setup.step} />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex min-w-56 flex-1 flex-col gap-0.5">
          <h2 className="text-sm leading-5 font-medium text-foreground">{title}</h2>
          <p className="text-xs leading-4.25 text-secondary">{description}</p>
        </div>
        <Link href={ONBOARDING_PATH} className={buttonClassName('primary', SMALL_BUTTON)}>
          Continue setup
        </Link>
      </div>
    </section>
  );
}

function StepBars({ current }: { current: OnboardingStep }) {
  const currentIndex = ONBOARDING_STEPS.indexOf(current);

  return (
    <span aria-hidden="true" className="ml-auto flex gap-1">
      {ONBOARDING_STEPS.map((step, index) => (
        <span
          key={step}
          className={cn(
            'h-0.75 w-9 rounded-xs',
            index < currentIndex ? 'bg-success' : index === currentIndex ? 'bg-accent' : 'bg-surface'
          )}
        />
      ))}
    </span>
  );
}

/**
 * The first thing on Configure after the steps are done: it says where setup lives from now on. It stays
 * until the operator dismisses it, and then folds away.
 */
export function SetupDoneBanner({ handle }: { handle: string }) {
  return (
    <FoldsAway action={dismissDoneBannerAction}>
      <section className="dither-side flex animate-rise-in flex-wrap items-center gap-3 rounded-lg border border-border-strong bg-subtle px-3.5 py-3 [--dither-opacity:0.75] motion-reduce:animate-none">
        {/* An icon here, not a character: it doesn't follow the pointer. */}
        <MascotFace art="idle" mood="happy" still className="size-7" />
        <div className="flex min-w-56 flex-1 flex-col gap-px">
          <h2 className="text-[13px] leading-4.5 font-medium text-foreground">{handle} is set up</h2>
          <p className="text-xs leading-4 text-secondary">
            Setup now lives in Agent setup below. Come back here to add channels or connect more agents.
          </p>
        </div>
        <Link href={DASHBOARD_HOME} className={buttonClassName('primary', SMALL_BUTTON)}>
          Open inbox
        </Link>
        <FoldAwayButton className={buttonClassName('quiet', cn(SMALL_BUTTON, 'text-foreground'))}>
          Dismiss
        </FoldAwayButton>
      </section>
    </FoldsAway>
  );
}
