'use client';

import { Check, Share2, Terminal, Users } from 'lucide-react';
import { type ReactNode, useTransition } from 'react';

import { finishOnboardingAction } from '@/app/(account)/onboarding/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import { shareCard } from '@/components/dashboard/share-card';
import { Eyebrow, StepTitle } from '@/components/onboarding/onboarding-shell';
import { ClockTime } from '@/components/onboarding/parts';
import { Badge } from '@/components/ui/badge';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { HOST_LABELS, type HostVia } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

type ReachStepProps = {
  handle: string;
  /** The public card's address, written out without `https://`. */
  cardLink: string;
  host: { via: HostVia; connectedAt: string; readAt?: string };
  /** Who wrote the message the host read on its way in, when one was waiting: the operator's test reply. */
  readFrom: string | null;
  channels: { telegram: boolean; slack: boolean };
};

type Destination = Parameters<typeof finishOnboardingAction>[0];

/** How long after one line of the trace the next one comes in. */
const TRACE_BEAT_MS = 140;

/**
 * Step 4: a host is connected, and the setup is complete. What is left is optional: more ways for people
 * to reach the agent. Every way out of this step ends the onboarding.
 */
export function ReachStep({ handle, cardLink, host, readFrom, channels }: ReachStepProps) {
  const [leaving, startLeaving] = useTransition();
  const leaveFor = (destination: Destination) => () => startLeaving(() => finishOnboardingAction(destination));

  return (
    <>
      <Eyebrow tone="success">Connected</Eyebrow>
      <StepTitle>
        Your agent is now on <em>{handle}</em>
      </StepTitle>

      {/* What happened, line after line, each a beat after the one before. */}
      <ul className="overflow-hidden rounded-[10px] border border-border bg-subtle font-mono text-xs leading-4.5 text-foreground">
        <TraceLine at={host.connectedAt} delay={TRACE_BEAT_MS}>
          <span className="flex size-5.5 shrink-0 items-center justify-center rounded-[5px] border border-border-strong bg-raised">
            <Terminal aria-hidden="true" className="size-3 text-default" strokeWidth={1.5} />
          </span>
          <span className="flex items-center gap-1.5">
            Connected from
            <span className="rounded border border-border-strong px-1.5 py-px text-[10px] leading-3.5 text-secondary">
              {HOST_LABELS[host.via]}
            </span>
          </span>
        </TraceLine>
        {host.readAt && (
          <TraceLine at={host.readAt} delay={TRACE_BEAT_MS * 2}>
            <span className="min-w-0 truncate">
              Read the waiting message{readFrom ? ` from ${readFrom}` : ''} · “Re: Hi, I’m {handle}”
            </span>
          </TraceLine>
        )}
        <li
          style={{ animationDelay: `${TRACE_BEAT_MS * 3}ms` }}
          className="flex animate-rise-in items-center gap-3 px-3.5 py-2.5 font-sans text-xs leading-4 text-secondary motion-reduce:animate-none"
        >
          <span aria-hidden="true" className="w-2.75 font-mono text-[13px] leading-4.5 font-medium text-muted">
            +
          </span>
          Run the same prompt in another agent to connect it too.
        </li>
      </ul>

      <hr className="border-border" />

      <div className="flex flex-col gap-1.5">
        <h2 className="text-base leading-5.5 font-medium text-foreground">Let people reach {handle}</h2>
        <p className="text-[13px] leading-4.75 text-secondary">Optional. You can do this later from Configure.</p>
      </div>

      <ul
        className={cn(
          'rounded-[10px] border border-border transition-opacity duration-200 motion-reduce:transition-none',
          leaving && 'pointer-events-none opacity-60'
        )}
      >
        <ReachRow
          icon={<ChannelIcon via="telegram" className="size-5 [&>svg]:size-3" />}
          title="Telegram"
          description={`People DM ${handle}’s bot.`}
          connected={channels.telegram}
          action="Set up"
          onAction={leaveFor('configure')}
        />
        <ReachRow
          icon={<ChannelIcon via="slack" className="size-5 [&>svg]:size-4" />}
          title="Slack"
          description="Its own app in your workspace."
          connected={channels.slack}
          action="Set up"
          onAction={leaveFor('configure')}
        />
        <ReachRow
          icon={
            <span className="flex size-5 items-center justify-center rounded-[5px] border border-border-strong bg-raised">
              <Users aria-hidden="true" className="size-3 text-secondary" strokeWidth={1.5} />
            </span>
          }
          title="Contacts"
          description="Invite people. Their messages skip screening."
          action="Invite"
          onAction={leaveFor('contacts')}
        />
      </ul>

      <div className="flex flex-wrap items-center gap-3">
        <Button pending={leaving} onClick={leaveFor('inbox')}>
          Open inbox
        </Button>
        <Button variant="quiet" className="text-foreground" onClick={() => shareCard(handle, cardLink)}>
          <Share2 aria-hidden="true" className="size-3.5" />
          Share {handle}’s card
        </Button>
      </div>
    </>
  );
}

function TraceLine({ at, delay, children }: { at: string; delay: number; children: ReactNode }) {
  return (
    <li
      style={{ animationDelay: `${delay}ms` }}
      className="flex animate-rise-in items-center gap-3 border-b border-border px-3.5 py-2.75 motion-reduce:animate-none"
    >
      <Check aria-hidden="true" className="size-2.75 shrink-0 text-success" strokeWidth={3} />
      <span className="flex min-w-0 flex-1 items-center gap-3">{children}</span>
      <span className="shrink-0 text-[11px] leading-4 text-muted">
        <ClockTime iso={at} seconds />
      </span>
    </li>
  );
}

type ReachRowProps = {
  icon: ReactNode;
  title: string;
  description: string;
  connected?: boolean;
  action: string;
  onAction: () => void;
};

function ReachRow({ icon, title, description, connected = false, action, onAction }: ReachRowProps) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-3.5 py-3 last:border-b-0">
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <h3 className="text-[13px] leading-4.5 font-medium text-foreground">{title}</h3>
        <p className="text-xs leading-4 text-secondary">{description}</p>
      </div>
      {connected ? (
        <Badge variant="success">Connected</Badge>
      ) : (
        <Button variant="secondary" className={SMALL_BUTTON} onClick={onAction}>
          {action}
        </Button>
      )}
    </li>
  );
}
