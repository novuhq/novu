'use client';

import { useClerk } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { AddressStep, type AgentDraft } from '@/components/onboarding/address-step';
import { ConnectStep } from '@/components/onboarding/connect-step';
import { IdentityStage, type IdentityState } from '@/components/onboarding/identity-stage';
import { OnboardingShell, SetupCard, StepRail } from '@/components/onboarding/onboarding-shell';
import { TimeAgo } from '@/components/onboarding/parts';
import { ReachStep } from '@/components/onboarding/reach-step';
import { TestStep } from '@/components/onboarding/test-step';
import { Button } from '@/components/ui/button';
import { StatusPoll } from '@/components/ui/status-poll';
import { toast } from '@/components/ui/toast';
import { useMeasuredHeight } from '@/hooks/use-measured-height';
import { useSwap } from '@/hooks/use-swap';
import type { HostId } from '@/lib/hosts';
import type { OnboardingView } from '@/lib/human-onboarding';
import { addressOf, cardLinkOf, type OnboardingStep, PLACEHOLDER_HANDLE } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

import { checkOnboardingToolConnectedAction, readOnboardingStatusAction } from './actions';

const IDENTITY_STATE: Record<OnboardingStep, IdentityState> = {
  address: 'draft',
  test: 'issued',
  connect: 'waiting',
  reach: 'connected',
};

/** How often the host status is checked while connecting or waiting for its first inbox read. */
const HOST_POLL_MS = 3000;

/** How often each step asks whether something happened outside the page. */
const POLL_MS: Partial<Record<OnboardingStep, number>> = { address: 3000, test: 4000, connect: HOST_POLL_MS };

/** Quicker while a message to the inbox is on its way. */
const REPLY_POLL_MS = 2000;

/** How long a step takes to fade out before the next one rises in. */
const SWAP_MS = 200;

/** What a chat app's steps ask this page's server while they wait for its sign-in. */
const TOOL_API = { isToolSignedIn: checkOnboardingToolConnectedAction };

/**
 * The onboarding, on whichever step the setup has reached. The server decides the step and
 * `OnboardingScreen` renders it; anything that changes outside the page (a setup in a terminal, the
 * reply, a host connecting) is noticed here, by asking the server again.
 */
export function OnboardingFlow({ view, initialHost }: OnboardingScreenProps) {
  const router = useRouter();
  const waitingForReply = view.step === 'test' && !view.test.replyAt;
  const waitingForHostRead =
    view.step === 'reach' && (view.waiting === null || view.waiting > 0) && !view.waitingMessage;
  let pollMs = POLL_MS[view.step];
  if (waitingForReply) {
    pollMs = REPLY_POLL_MS;
  } else if (waitingForHostRead) {
    pollMs = HOST_POLL_MS;
  }

  if (view.hostStatusUnavailable) {
    return (
      <>
        <StatusPoll status={view.status} read={readOnboardingStatusAction} everyMs={HOST_POLL_MS} />
        <OnboardingShell aside={<Aside email={view.operator.email} />}>
          <section className="flex w-full max-w-lg flex-col items-start gap-4 rounded-xl border border-border bg-background p-8">
            <h1 className="text-xl font-medium text-foreground">We couldn’t check your agent’s connection</h1>
            <p className="text-sm leading-5 text-secondary">
              Your agent may already be connected. Try again instead of connecting it a second time.
            </p>
            <Button variant="secondary" onClick={() => router.refresh()}>
              Try again
            </Button>
          </section>
        </OnboardingShell>
      </>
    );
  }

  return (
    <>
      {pollMs && <StatusPoll status={view.status} read={readOnboardingStatusAction} everyMs={pollMs} />}
      <OnboardingScreen view={view} initialHost={initialHost} />
    </>
  );
}

type OnboardingScreenProps = {
  view: OnboardingView;
  /** The host the "Connect" step starts on (`?connect=codex`), instead of the first one. */
  initialHost?: HostId | null;
};

/** One screen of the onboarding: the page chrome, the step on the left and the agent's card on the right. */
export function OnboardingScreen({ view, initialHost }: OnboardingScreenProps) {
  const { step, agent, operator, test, host } = view;
  // Step 1 has no agent yet: its card is drawn from what the operator is typing.
  const [draft, setDraft] = useState<AgentDraft>({ name: '', handle: '' });
  // The step on show stays a moment longer than the setup does, to fade out before the next one comes.
  // Everything around it (the steps across the top, the agent's card) moves on at once.
  const { shown, leaving } = useSwap(step, SWAP_MS);
  const { ref, height } = useMeasuredHeight();
  // Mail is in: the test has passed, though the operator is still on its step.
  const testPassed = step === 'test' && Boolean(test.replyAt);

  return (
    <OnboardingShell aside={<Aside email={operator.email} />}>
      <SetupCard
        stage={
          <IdentityStage
            state={IDENTITY_STATE[step]}
            name={agent?.name ?? draft.name}
            subtitle={
              agent ? (
                <>
                  {operator.firstName ? `${operator.firstName}’s agent` : 'Your agent'} · created{' '}
                  <TimeAgo iso={agent.createdAt} />
                </>
              ) : (
                'Your agent’s inbox · not created yet'
              )
            }
            address={agent?.address || (draft.handle ? addressOf(draft.handle, view.mailDomain) : '')}
            cardLink={agent?.cardLink ?? cardLinkOf(view.origin, draft.handle || PLACEHOLDER_HANDLE)}
            telegramConnected={view.channels.telegram}
            gotMail={testPassed}
            hostVia={host?.via}
            caption={describeFigure(step)}
          />
        }
      >
        <StepRail
          current={step}
          currentDone={testPassed}
          // A test that passed left its step looking finished before the operator moved on.
          previousDone={step === 'connect' && Boolean(test.replyAt)}
        />
        {/* The steps differ in height: the card grows or shrinks to the next one while it fades in. */}
        <div style={{ height }} className="transition-[height] duration-300 ease-out motion-reduce:transition-none">
          <div ref={ref}>
            <div
              key={shown}
              className={cn(
                'flex flex-col gap-5.5',
                leaving
                  ? 'pointer-events-none opacity-0 transition-opacity duration-200 ease-in motion-reduce:transition-none'
                  : 'animate-rise-in motion-reduce:animate-none'
              )}
            >
              {shown === 'address' && <AddressStep mailDomain={view.mailDomain} onDraftChange={setDraft} />}
              {shown === 'test' && agent && (
                <TestStep
                  name={agent.name}
                  address={agent.address}
                  operatorEmail={operator.email}
                  sentAt={test.sentAt}
                  replyAt={test.replyAt}
                  inboundFrom={test.from}
                  inboundSubject={test.subject}
                />
              )}
              {shown === 'connect' && agent && (
                <ConnectStep
                  handle={agent.handle}
                  apiUrl={view.apiUrl}
                  waiting={view.waiting ?? 0}
                  mcpUrl={view.mcpUrl}
                  connectedHosts={view.connectedTools}
                  api={TOOL_API}
                  initialHost={initialHost}
                />
              )}
              {shown === 'reach' && agent && host && (
                <ReachStep
                  handle={agent.handle}
                  cardLink={agent.cardLink}
                  host={host}
                  waitingMessage={view.waitingMessage}
                  channels={view.channels}
                  channelSetup={view.channelSetup}
                  reach={view.reach}
                />
              )}
            </div>
          </div>
        </div>
      </SetupCard>
    </OnboardingShell>
  );
}

/** The caption in the corner of the stage, numbered like the figures of a manual. */
function describeFigure(step: OnboardingStep): string {
  if (step === 'address') {
    return 'fig. 01  naming';
  }

  return step === 'reach' ? 'fig. 04  issued and connected' : 'fig. 02  issued';
}

/** The right end of the top bar, the same on every step: who is signed in, and the way to sign out. */
function Aside({ email }: { email: string | null }) {
  return (
    <>
      {email && <p className="min-w-0 truncate font-mono text-xs leading-4 text-muted">{email}</p>}
      <SignOutButton />
    </>
  );
}

function SignOutButton() {
  const { signOut } = useClerk();
  const [pending, setPending] = useState(false);

  async function leave() {
    setPending(true);

    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Failed to sign out', error);
      toast("Couldn't sign you out. Please try again.", 'error');
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={leave}
      disabled={pending}
      className="shrink-0 rounded-sm text-[13px] leading-4.5 text-default hover:text-foreground disabled:opacity-60"
    >
      Sign out
    </button>
  );
}
