'use client';

import { Check, Share2, Terminal, Users } from 'lucide-react';
import { type ReactNode, useState, useTransition } from 'react';

import { finishOnboardingAction } from '@/app/(account)/onboarding/actions';
import { ChannelIcon } from '@/components/channels/channel-icon';
import { SWAP_LAYER } from '@/components/channels/setup-parts';
import { SlackSetup } from '@/components/channels/slack-setup';
import { TelegramSetup } from '@/components/channels/telegram-setup';
import { ShareDialog } from '@/components/dashboard/share-dialog';
import { Eyebrow, StepTitle } from '@/components/onboarding/onboarding-shell';
import { ClockTime } from '@/components/onboarding/parts';
import { Badge } from '@/components/ui/badge';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import type { AgentReach } from '@/lib/agent-settings';
import type { HostStatus } from '@/lib/host-status';
import type { OnboardingChannelSetup } from '@/lib/human-onboarding';
import { HOST_LABELS, type HostVia } from '@/lib/onboarding';
import { cn } from '@/lib/utils';

type ReachStepProps = {
  handle: string;
  /** The public card's link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). Shown as `writtenLink` writes it. */
  cardLink: string;
  host: { via: HostVia; connectedAt: string };
  /** The unread message the first host check found, when there was one. */
  waitingMessage: HostStatus['waitingMessage'];
  channels: { telegram: boolean; slack: boolean };
  /** What the Telegram and Slack drawers open with. Without it, "Set up" leaves for Configure instead. */
  channelSetup: OnboardingChannelSetup | null;
  /** Who can reach the agent, for the Share dialog. */
  reach: AgentReach | null;
};

type Destination = Parameters<typeof finishOnboardingAction>[0];

/** The channels whose setup opens in a drawer over this step, the one the Configure page has. */
type DrawerChannel = 'telegram' | 'slack';

/** How long after one line of the trace the next one comes in. */
const TRACE_BEAT_MS = 140;

/**
 * Step 4: a host is connected, and the setup is complete. What is left is optional: more ways for people
 * to reach the agent. Telegram and Slack are set up in their Configure drawers, over this step; every
 * other way out of it ends the onboarding.
 */
export function ReachStep({ handle, cardLink, host, waitingMessage, channels, channelSetup, reach }: ReachStepProps) {
  const [leaving, startLeaving] = useTransition();
  const [sharing, setSharing] = useState(false);
  const [drawer, setDrawer] = useState<DrawerChannel | null>(null);
  // What the page knew when a drawer opened. The page reloads while one is open (once a channel connects, or
  // the host reads its first message), and a drawer that is handed a new setup starts over from it.
  const [setupAtOpen, setSetupAtOpen] = useState(channelSetup);
  const leaveFor = (destination: Destination) => () => startLeaving(() => finishOnboardingAction(destination));
  const setUp = (via: DrawerChannel) =>
    channelSetup
      ? () => {
          setSetupAtOpen(channelSetup);
          setDrawer(via);
        }
      : leaveFor('configure');
  const drawerProps = (via: DrawerChannel) => ({
    open: drawer === via,
    onOpenChange: (open: boolean) => setDrawer(open ? via : null),
  });

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
        {waitingMessage && (
          <TraceLine at={waitingMessage.seenAt} delay={TRACE_BEAT_MS * 2}>
            <span className="min-w-0 truncate">
              Read the waiting message from {waitingMessage.from} · “{waitingMessage.subject}”
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
          onAction={setUp('telegram')}
        />
        <ReachRow
          icon={<ChannelIcon via="slack" className="size-5 [&>svg]:size-4" />}
          title="Slack"
          description="Its own app in your workspace."
          connected={channels.slack}
          action="Set up"
          onAction={setUp('slack')}
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
        <Button variant="quiet" className="text-foreground" onClick={() => setSharing(true)}>
          <Share2 aria-hidden="true" className="size-3.5" />
          Share {handle}’s card
        </Button>
      </div>

      <ShareDialog open={sharing} onOpenChange={setSharing} handle={handle} cardLink={cardLink} reach={reach} />
      {setupAtOpen && (
        // The drawers' refresh buttons have tooltips, which the dashboard's layout provides for on Configure.
        <TooltipProvider delayDuration={300}>
          <TelegramSetup
            setup={setupAtOpen.telegram}
            handle={handle}
            prompt={setupAtOpen.prompts.telegram}
            {...drawerProps('telegram')}
          />
          <SlackSetup
            setup={setupAtOpen.slack}
            agentName={setupAtOpen.slackAppName}
            handle={handle}
            prompt={setupAtOpen.prompts.slack}
            {...drawerProps('slack')}
          />
        </TooltipProvider>
      )}
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
  /** For a channel: whether it is connected, which swaps the button for "Connected". */
  connected?: boolean;
  action: string;
  onAction: () => void;
};

function ReachRow({ icon, title, description, connected, action, onAction }: ReachRowProps) {
  const button = (
    <Button variant="secondary" className={SMALL_BUTTON} onClick={onAction}>
      {action}
    </Button>
  );

  return (
    <li className="flex items-center gap-3 border-b border-border px-3.5 py-3 last:border-b-0">
      {icon}
      <div className="flex min-w-0 flex-1 flex-col gap-px">
        <h3 className="text-[13px] leading-4.5 font-medium text-foreground">{title}</h3>
        <p className="text-xs leading-4 text-secondary">{description}</p>
      </div>
      {connected === undefined ? (
        button
      ) : (
        // The button and "Connected" share one spot, as wide as the wider of the two, and cross-fade when the
        // channel connects, so nothing else in the row moves. The one that's out is inert: clicks go through it
        // to the one on show, which a see-through "Connected" on top of the button would otherwise take.
        <div className="grid shrink-0 items-center justify-items-end">
          <div inert={connected} className={cn(SWAP_LAYER, connected && '-translate-y-1 opacity-0')}>
            {button}
          </div>
          <div inert={!connected} className={cn(SWAP_LAYER, !connected && 'translate-y-1 opacity-0')}>
            <Badge variant="success">Connected</Badge>
          </div>
        </div>
      )}
    </li>
  );
}
