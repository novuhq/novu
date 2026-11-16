'use client';

import { useCallback, useMemo, useTransition } from 'react';

import {
  checkOnboardingToolConnectedAction,
  createOnboardingConnectCodeAction,
  leaveSayHiConnectAction,
} from '@/app/(account)/onboarding/actions';
import { ONBOARDING_EVENTS, trackOnboarding } from '@/components/analytics/analytics';
import { HostPicker } from '@/components/connect/host-picker';
import { HostPanel } from '@/components/connect/host-steps';
import { DOCS_URL } from '@/components/dashboard/nav';
import { Button } from '@/components/ui/button';
import { useHostConnectCode } from '@/hooks/use-connect-code';
import type { HostId } from '@/lib/hosts';
import type { SayHiView } from '@/lib/human-onboarding';

import { type BubblePlace, type MascotShadow, MascotSlot, SpotlightSlot } from './mascot-stage';
import { ScreenSpace } from './parts';

const TOOL_API = { isToolSignedIn: checkOnboardingToolConnectedAction };

/** A.3's bubble, over the mascot's right half: its tail 151px in and 75px down on the 252px mascot. */
/** The mascot's shadow on A.3, the design's 137.5×18 oval, a little left of its middle (shares of its 252px). */
const GROUND_SHADOW: MascotShadow = { left: 0.2113, top: 0.9167, width: 0.5456 };

const CONNECT_BUBBLE: BubblePlace = { left: 151 / 252, bottom: (252 - 75) / 252 };

type ConnectScreenProps = {
  view: SayHiView;
  agent: NonNullable<SayHiView['agent']>;
  host: HostId;
  onHostChange: (host: HostId) => void;
};

/**
 * A.3 · Connect · waiting. The host picked on A.2, with its ways in as on the dashboard: a tab for each, the one-time
 * code in its commands, the button that copies what the box shows. The page waits for the host and moves on by
 * itself once it has come in; "Do it later" goes to the inbox, and "Continue setup" brings the operator back.
 */
export function ConnectScreen({ view, agent, host, onHostChange }: ConnectScreenProps) {
  const createCode = useCallback(
    (forHost: HostId) => createOnboardingConnectCodeAction(agent.handle, forHost),
    [agent.handle]
  );
  const { state: code, retry } = useHostConnectCode(createCode, host, true);
  const connected = useMemo(() => new Set<HostId>(view.connectedTools), [view.connectedTools]);
  const [leaving, startLeaving] = useTransition();

  const leave = () => {
    trackOnboarding(ONBOARDING_EVENTS.LEFT, { step: 'connect', button: 'do it later' });
    startLeaving(() => leaveSayHiConnectAction());
  };

  return (
    <ScreenSpace above={150} below={98}>
      {/* The design's 1120px stage: the connect column on its left, the mascot to its right on a wide screen. */}
      <div className="relative flex w-full max-w-280 flex-col items-center lg:block">
        <SpotlightSlot opacity={0.2} className="top-[-150px] left-[calc(50%-500px)] lg:left-[376px]" />
        <div className="relative mb-2 lg:absolute lg:top-33.75 lg:left-188.5 lg:mb-0">
          <MascotSlot
            bubble="Copy this first. I’ll be right here."
            mood="asleep"
            bubbleAt={CONNECT_BUBBLE}
            shadow={GROUND_SHADOW}
            bubbleWidth={300}
            className="w-35 lg:w-63"
          />
        </div>

        <div className="flex w-full max-w-175 flex-col gap-10 py-6 lg:p-11">
          <div className="flex w-full min-w-0 flex-col items-start gap-5.5">
            <div className="-mx-4 max-w-[calc(100%+2rem)] overflow-x-auto px-4 [scrollbar-width:none] lg:mx-0 lg:max-w-full lg:px-0 [&::-webkit-scrollbar]:hidden">
              <HostPicker selected={host} onSelect={onHostChange} connected={connected} className="flex-nowrap" />
            </div>
            <div className="w-full">
              <HostPanel
                selected={host}
                handle={agent.handle}
                address={agent.address}
                apiUrl={view.apiUrl}
                code={code}
                onRetry={retry}
                mcpUrl={view.mcpUrl}
                docsUrl={DOCS_URL}
                connected={connected}
                api={TOOL_API}
                showWaiting={false}
                showListen={false}
                showSignedIn={false}
                onCopy={(way) =>
                  trackOnboarding(ONBOARDING_EVENTS.COPIED, { step: 'connect', host, way, opened: false })
                }
              />
            </div>
            <a
              href={`${DOCS_URL}/reference/rest`}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm text-xs leading-4 text-default transition-colors hover:text-foreground"
            >
              Building your own? SDK and API →
            </a>
          </div>

          <section className="flex flex-col items-start">
            <h1 className="text-2xl leading-7.5 font-medium tracking-[-0.015em] text-foreground">
              Connect your agent.
            </h1>
            <p className="mt-1.5 text-sm leading-5 text-secondary">Your agent hangs around while you set it up.</p>
            <div className="mt-4.5 flex flex-wrap items-center gap-2.5">
              {/* biome-ignore lint/a11y/useSemanticElements: an <output> is for the result of a form, not a waiting state */}
              <p
                role="status"
                className="flex h-8 items-center gap-2 rounded-full border border-foreground/8 bg-foreground/5 pr-3 pl-2.5 text-xs leading-4 font-medium text-foreground/75"
              >
                <span aria-hidden="true" className="size-1.75 shrink-0 animate-pulse rounded-full bg-accent" />
                Waiting for {agent.name} to connect…
              </p>
              <Button variant="quiet" pending={leaving} onClick={leave}>
                Do it later
              </Button>
            </div>
          </section>
        </div>
      </div>
    </ScreenSpace>
  );
}
