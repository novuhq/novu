'use client';

import { SquareTerminal } from 'lucide-react';
import { useState, useTransition } from 'react';

import { finishOnboardingAction } from '@/app/(account)/onboarding/actions';
import { AgentCardMini } from '@/components/agent-card/agent-card-mini';
import { ONBOARDING_EVENTS, trackOnboarding } from '@/components/analytics/analytics';
import { HostLogo } from '@/components/connect/host-logo';
import { ListenStep } from '@/components/connect/host-steps';
import { ShareDialog, useShareImageAhead } from '@/components/dashboard/share-dialog';
import { Button } from '@/components/ui/button';
import { type HostId, hostOf, listenCommand } from '@/lib/hosts';
import type { SayHiView } from '@/lib/human-onboarding';

import { DepthFloor, MascotSlot, SpotlightSlot } from './mascot-stage';
import { KeyHints, ScreenLead, ScreenSpace, ScreenTitle, useShortcut } from './parts';
import { greetingOf, SAY_HI_PROMPT, saidHiLead, saidHiTitle, sayHiWayOf } from './say-hi-words';

type SaidHiScreenProps = {
  view: SayHiView;
  agent: NonNullable<SayHiView['agent']>;
  pickedHost: HostId;
};

/**
 * A.4 · Said hi. The agent showed its card: the screen shows what happened where the operator talks to it, in
 * that host's window (a terminal's after the CLI), with the prompt they gave, the agent's hello and its card, which
 * the mascot has come to sit on. From here the inbox opens, the card can be shared, and an agent connected through
 * the CLI to Claude Code, Codex or OpenCode can be told to listen for messages.
 */
export function SaidHiScreen({ view, agent, pickedHost }: SaidHiScreenProps) {
  const hostId = view.cardShown?.host ?? view.connected?.host ?? pickedHost;
  const host = hostOf(hostId);
  const way = sayHiWayOf(hostId, view.cardShown?.via ?? view.connected?.via ?? null);
  const inTerminal = way === 'cli';
  const listens = inTerminal && host.group === 'commands' ? listenCommand(host) : undefined;
  const [sharing, setSharing] = useState(false);
  const [opening, startOpening] = useTransition();
  // The card can't change on this screen: its share image is asked for now, and the sheet shows it at once.
  useShareImageAhead();

  const openInbox = () => {
    trackOnboarding(ONBOARDING_EVENTS.LEFT, { step: 'said hi', button: 'open inbox' });
    startOpening(() => finishOnboardingAction('inbox'));
  };
  const share = () => {
    trackOnboarding(ONBOARDING_EVENTS.CARD_SHARE_OPENED, { from: 'onboarding' });
    setSharing(true);
  };

  useShortcut('Enter', openInbox, { enabled: !opening && !sharing });
  useShortcut('s', share, { enabled: !sharing });

  return (
    <ScreenSpace above={70} below={145}>
      <div className="relative flex w-full max-w-160 flex-col items-center">
        <SpotlightSlot opacity={0.18} className="top-[-110px] left-[calc(50%-500px)]" />
        {/* The floor's dots start 17.5px above the window's bottom edge, whichever window it is. */}
        <div className="relative w-full">
          <DepthFloor className="top-[calc(100%-17.5px)] left-[calc(50%-211.5px)] hidden lg:block" />
          <section
            aria-label={inTerminal ? 'What happened in your terminal' : `What happened in ${host.name}`}
            className="relative w-full overflow-hidden rounded-2xl border border-[#2e2e2e] bg-[#101010] shadow-[0_24px_60px_0_rgb(0_0_0/0.5)]"
          >
            <header className="flex items-center gap-2 border-b border-[#1f1f1f] px-4 py-3">
              {inTerminal ? (
                <SquareTerminal className="size-4 text-default" aria-hidden="true" />
              ) : (
                <HostLogo host={host} size="small" />
              )}
              <p className="min-w-0 truncate text-[13px] leading-4.25 font-medium text-foreground">
                {inTerminal ? 'Terminal' : host.name}
              </p>
              <p className="ml-auto flex h-6 shrink-0 items-center gap-1.5 rounded-md border border-[#2e2e2e] px-2 font-mono text-[11px] leading-3.5 text-foreground/60">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
                connected
              </p>
            </header>
            <div className="flex flex-col items-start gap-4 px-4 pt-6 pb-5 sm:px-7">
              {!inTerminal && (
                <>
                  <p className="rounded-2xl bg-[#212121] px-3.5 py-2.5 text-[13px] leading-4.25 text-foreground">
                    {SAY_HI_PROMPT}
                  </p>
                  <p className="font-mono text-[11px] leading-3.5 whitespace-pre text-foreground/40">
                    {'Used agentinbox  ·  agent_card'}
                  </p>
                </>
              )}
              <p className="text-sm leading-5.5 text-foreground">{greetingOf(agent.name, view.operator.firstName)}</p>
              <AgentCardMini
                look={agent.look}
                name={agent.name}
                address={agent.address}
                cardLink={agent.cardLink}
                mascot={<MascotSlot className="w-full" />}
              />
            </div>
            {!inTerminal && (
              <div aria-hidden="true" className="px-5 pb-5">
                <p className="rounded-[20px] border border-[#1f1f1f] bg-[#1a1a1a] px-4 py-3 text-[13px] leading-4.25 text-foreground/35 opacity-20">
                  Ask anything
                </p>
              </div>
            )}
          </section>
        </div>

        <ScreenTitle className="mt-11.5 text-2xl leading-7.5">{saidHiTitle(agent.name, host, way)}</ScreenTitle>
        <ScreenLead className="mt-2 max-w-[443px]">{saidHiLead(agent.name, host, way)}</ScreenLead>

        {listens && host.group === 'commands' && (
          <div className="mt-6.5 w-full max-w-130">
            <ListenStep host={host} handle={agent.handle} command={listens} />
          </div>
        )}

        <div className="mt-6.5 flex flex-wrap items-center justify-center gap-2.5">
          <Button onClick={openInbox} pending={opening}>
            Open {agent.name}’s inbox
          </Button>
          <Button variant="quiet" onClick={share}>
            Share card
          </Button>
        </div>
        <div className="mt-5">
          <KeyHints
            hints={[
              { keys: ['enter'], label: 'open inbox' },
              { keys: ['S'], label: 'share card' },
            ]}
          />
        </div>

        <ShareDialog
          open={sharing}
          onOpenChange={setSharing}
          handle={agent.handle}
          cardLink={agent.cardLink}
          reach={view.reach}
        />
      </div>
    </ScreenSpace>
  );
}
