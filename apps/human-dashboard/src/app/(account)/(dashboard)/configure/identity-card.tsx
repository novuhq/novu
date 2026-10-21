'use client';

import { Bot, Share2 } from 'lucide-react';

import {
  type AgentState,
  CardLine,
  CardName,
  CardPortrait,
  CopyLine,
  Pending,
  StateDot,
} from '@/components/agent-card/card-parts';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { writtenLink } from '@/lib/onboarding';

import { ChannelLogo } from './channel-logo';

export type { AgentState };

export type IdentityCardProps = {
  name: string;
  /** Its address without the domain, as the CLI and the public card know it. */
  handle: string;
  /** The agent's email address, or `null` while its email channel has none. */
  address: string | null;
  /** The public card's link, `https://agentinbox.md/p/atlas` (`cardLinkOf`). Shown as `writtenLink` writes it. */
  cardLink: string;
  pictureUrl?: string;
  createdAt?: string;
  /** Who runs the agent, as the card names them: "Ada L.", when Clerk has their first name. */
  operatorName: string;
  state: AgentState;
  /** A host reads the agent's mail: one checked the inbox within the last day. */
  hostConnected: boolean;
  /**
   * Telegram, once connected: its bot's `@username`, or `null` when the bot's name couldn't be read just
   * now, which still shows as connected.
   */
  telegram: { bot: string | null } | null;
  /** Its Slack app and the workspace it's installed in, once Slack is connected. */
  slack: string | null;
  /** "Share card": opens the Share dialog. */
  onShare: () => void;
};

/**
 * The agent's ID card (`Agent ID card` in the design): its portrait, its name, one line for each way to
 * reach it and the host behind it, and the link to its public card.
 */
export function IdentityCard(props: IdentityCardProps) {
  const { name, handle, address, cardLink, operatorName, createdAt, hostConnected, telegram, slack, onShare } = props;

  return (
    <section
      aria-label={`${name}’s card`}
      className="w-full max-w-85 shrink-0 overflow-hidden rounded-[14px] border border-border-strong bg-background lg:w-85"
    >
      <CardPortrait handle={handle} address={address} pictureUrl={props.pictureUrl} state={props.state} />

      <CardName name={name} operatorName={operatorName} createdAt={createdAt} />

      <ul className="flex flex-col px-3 pb-2">
        <CardLine
          icon={<ChannelLogo via="email" size={16} />}
          label={address ?? 'No address yet'}
          live={Boolean(address)}
          end={address ? <CopyLine value={address} label="Copy the email address" /> : <Pending />}
        />
        <CardLine
          icon={
            <span className="flex size-4 shrink-0 items-center justify-center rounded border border-border-strong bg-raised">
              <Bot aria-hidden="true" className="size-2.5 text-muted" strokeWidth={1.5} />
            </span>
          }
          label={hostConnected ? 'active' : 'Not connected'}
          live={hostConnected}
          highlighted
          fades
          end={<StateDot className={hostConnected ? 'bg-success' : 'bg-muted'} />}
        />
        <CardLine
          icon={<ChannelLogo via="telegram" size={16} />}
          label={telegram ? (telegram.bot ?? 'Connected') : 'Not set up'}
          live={Boolean(telegram)}
          end={
            telegram?.bot ? (
              <CopyLine value={telegram.bot} label="Copy the Telegram bot handle" />
            ) : telegram ? (
              <StateDot className="bg-success" />
            ) : (
              <Pending />
            )
          }
        />
        <CardLine
          icon={<ChannelLogo via="slack" size={16} />}
          label={slack ?? 'Not set up'}
          live={Boolean(slack)}
          end={slack ? <StateDot className="bg-success" /> : <Pending />}
        />
      </ul>

      <div className="flex items-center gap-2 border-t border-border bg-subtle/90 px-3.5 py-3">
        <p className="min-w-0 flex-1 truncate font-mono text-xs leading-4 text-default">{writtenLink(cardLink)}</p>
        <CopyButton
          value={cardLink}
          label="Copy the link to the card"
          variant="secondary"
          className="size-7 px-0 text-foreground"
          iconClassName="size-4"
        />
        <Button variant="secondary" className={SMALL_BUTTON} onClick={onShare}>
          <Share2 aria-hidden="true" className="size-3.5" />
          Share card
        </Button>
      </div>
    </section>
  );
}
