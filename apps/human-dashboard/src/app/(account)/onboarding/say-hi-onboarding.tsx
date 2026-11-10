'use client';

import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { ONBOARDING_EVENTS, trackOnboarding } from '@/components/analytics/analytics';
import { OnboardingShell } from '@/components/onboarding/onboarding-shell';
import { ConnectScreen } from '@/components/say-hi/connect-screen';
import { HostScreen } from '@/components/say-hi/host-screen';
import { MascotStage, SpotlightLayer } from '@/components/say-hi/mascot-stage';
import { NameScreen } from '@/components/say-hi/name-screen';
import { ProgressDots } from '@/components/say-hi/parts';
import { SaidHiScreen } from '@/components/say-hi/said-hi-screen';
import { SayHiScreen } from '@/components/say-hi/say-hi-screen';
import { StatusPoll } from '@/components/ui/status-poll';
import { DEFAULT_HOST, type HostId } from '@/lib/hosts';
import type { SayHiView } from '@/lib/human-onboarding';
import { type AgentLook, ORIGINAL_LOOK } from '@/lib/look';
import { redaction } from '@/lib/redaction-font';
import { type SayHiStep, stepNumberOf } from '@/lib/say-hi-progress';

import { readOnboardingStatusAction } from './actions';

/** How often the screens that wait for something outside the page ask how things stand. */
const POLL_MS = 3000;

/** Where a host connecting or the card being shown is what moves the onboarding on. */
const WAITS: ReadonlySet<SayHiStep> = new Set(['host', 'connect', 'say-hi']);

/** How each step is named in Mixpanel. */
const STEP_NAMES: Record<SayHiView['step'], string> = {
  name: 'name',
  host: 'host',
  connect: 'connect',
  'say-hi': 'say hi',
  'said-hi': 'said hi',
};

type SayHiOnboardingProps = {
  view: SayHiView;
  /** The host a public host page sent the operator here for (`?connect=codex`), picked on A.2. */
  initialHost: HostId | null;
  /** The right end of the top bar: who is signed in, and the way to sign out. */
  aside: ReactNode;
};

/**
 * The onboarding where the agent says hi with its card: A.1 names the agent and picks its look, A.2 where it
 * lives, A.3 connects it, A.4a asks it to say hi, and A.4 shows it did. The server decides the step from what is
 * true, and the page asks again every few seconds while a host or a card is on its way, so it moves on by itself.
 *
 * One mascot stays on screen all the way through (`MascotStage`); everything else on a screen fades out and the
 * next screen rises in.
 */
export function SayHiOnboarding({ view, initialHost, aside }: SayHiOnboardingProps) {
  const { step } = view;
  const reduced = useReducedMotion();
  const [draftLook, setDraftLook] = useState<AgentLook>(ORIGINAL_LOOK);
  const [host, setHost] = useState<HostId>(view.pickedHost ?? initialHost ?? DEFAULT_HOST);
  const look = view.agent?.look ?? draftLook;

  useStepAnalytics(view);

  return (
    <MascotStage look={{ shape: look.shape, color: look.color }} className={redaction.variable}>
      {WAITS.has(step) && <StatusPoll status={view.status} read={readOnboardingStatusAction} everyMs={POLL_MS} />}
      <OnboardingShell aside={aside} canvas>
        <SpotlightLayer color={look.color} />
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={step}
            className="relative flex w-full flex-1 flex-col items-center"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -10 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            {step === 'name' && (
              <NameScreen
                mailDomain={view.mailDomain}
                origin={view.origin}
                operatorEmail={view.operator.email}
                look={draftLook}
                onLookChange={setDraftLook}
              />
            )}
            {step === 'host' && view.agent && <HostScreen agent={view.agent} host={host} onHostChange={setHost} />}
            {step === 'connect' && view.agent && (
              <ConnectScreen view={view} agent={view.agent} host={host} onHostChange={setHost} />
            )}
            {step === 'say-hi' && view.agent && <SayHiScreen view={view} agent={view.agent} pickedHost={host} />}
            {step === 'said-hi' && view.agent && <SaidHiScreen view={view} agent={view.agent} pickedHost={host} />}
          </motion.div>
        </AnimatePresence>
        {/* `Progress`: in the same place on every step, 48px above the footer. */}
        <div className="flex justify-center pb-12">
          <ProgressDots current={stepNumberOf(step)} />
        </div>
      </OnboardingShell>
    </MascotStage>
  );
}

/**
 * Counts each screen once as it is shown, and the host coming in once, as the page moves from waiting for it to
 * asking the agent to say hi.
 */
function useStepAnalytics(view: SayHiView) {
  const counted = useRef<SayHiView['step'] | null>(null);

  useEffect(() => {
    const before = counted.current;
    if (before === view.step) {
      return;
    }

    counted.current = view.step;
    const host = view.connected?.host ?? view.pickedHost;
    trackOnboarding(ONBOARDING_EVENTS.STEP_VIEWED, { step: STEP_NAMES[view.step], host });

    const cameIn = (before === 'host' || before === 'connect') && (view.step === 'say-hi' || view.step === 'said-hi');
    if (cameIn) {
      trackOnboarding(ONBOARDING_EVENTS.HOST_CONNECTED, { host, way: view.connected?.via ?? null });
    }
  }, [view.step, view.connected, view.pickedHost]);
}
