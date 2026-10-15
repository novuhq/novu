'use client';

import { Bot, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';
import QRCode from 'react-qr-code';

import { shareCard } from '@/components/dashboard/share-card';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import { MascotFace, useBeaming } from '@/components/ui/mascot-face';
import { cn } from '@/lib/utils';

import { ShortDate } from '../contacts/short-date';
import { ChannelLogo } from './channel-logo';

/** How the agent stands, in the chip on its portrait. */
export type AgentState = 'active' | 'waiting' | 'paused';

const STATE_DOT: Record<AgentState, string> = {
  active: 'bg-success',
  // Amber while no host reads its mail, as the onboarding's "setup not finished" frame draws it.
  waiting: 'bg-warning',
  paused: 'bg-muted',
};

export type IdentityCardProps = {
  name: string;
  /** Its address without the domain, as the CLI and the public card know it. */
  handle: string;
  /** The agent's email address, or `null` while its email channel has none. */
  address: string | null;
  /** The public card's address, written out without `https://`. */
  cardLink: string;
  pictureUrl?: string;
  createdAt?: string;
  /** Who runs the agent: the operator's full name, when Clerk has one. */
  operatorName: string;
  state: AgentState;
  /** A host reads the agent's mail: a CLI login was approved, a connector signed in, or it came from a terminal. */
  hostConnected: boolean;
  /**
   * Telegram, once connected: its bot's `@username`, or `null` when the bot's name couldn't be read just
   * now, which still shows as connected.
   */
  telegram: { bot: string | null } | null;
  /** Its Slack app and the workspace it's installed in, once Slack is connected. */
  slack: string | null;
};

/**
 * The agent's ID card (`Agent ID card` in the design): its portrait, its name, one line for each way to
 * reach it and the host behind it, and the link to its public card.
 */
export function IdentityCard(props: IdentityCardProps) {
  const { name, handle, address, cardLink, operatorName, createdAt, hostConnected, telegram, slack } = props;

  return (
    <section
      aria-label={`${name}’s card`}
      className="w-full max-w-85 shrink-0 overflow-hidden rounded-[14px] border border-border-strong bg-background lg:w-85"
    >
      <Portrait {...props} />

      <div className="flex flex-col items-center gap-1 px-5 pt-4.5 pb-3.5 text-center">
        <h2 className="max-w-full truncate text-[22px] leading-7 font-medium tracking-[-0.3px] text-foreground">
          {name}
        </h2>
        <p className="text-xs leading-4 text-secondary">
          {operatorName ? `Run by ${operatorName}` : 'Your agent'}
          {createdAt && (
            <>
              {' · issued '}
              <ShortDate iso={createdAt} todayLabel="today" />
            </>
          )}
        </p>
      </div>

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
          end={<Dot className={hostConnected ? 'bg-success' : 'bg-muted'} />}
        />
        <CardLine
          icon={<ChannelLogo via="telegram" size={16} />}
          label={telegram ? (telegram.bot ?? 'Connected') : 'Not set up'}
          live={Boolean(telegram)}
          end={
            telegram?.bot ? (
              <CopyLine value={telegram.bot} label="Copy the Telegram bot handle" />
            ) : telegram ? (
              <Dot className="bg-success" />
            ) : (
              <Pending />
            )
          }
        />
        <CardLine
          icon={<ChannelLogo via="slack" size={16} />}
          label={slack ?? 'Not set up'}
          live={Boolean(slack)}
          end={slack ? <Dot className="bg-success" /> : <Pending />}
        />
      </ul>

      <div className="flex items-center gap-2 border-t border-border bg-subtle/90 px-3.5 py-3">
        <p className="min-w-0 flex-1 truncate font-mono text-xs leading-4 text-default">{cardLink}</p>
        <CopyButton
          value={`https://${cardLink}`}
          label="Copy the link to the card"
          variant="secondary"
          className="size-7 px-0 text-foreground"
          iconClassName="size-4"
        />
        <Button variant="secondary" className={SMALL_BUTTON} onClick={() => void shareCard(handle, cardLink)}>
          <Share2 aria-hidden="true" className="size-3.5" />
          Share card
        </Button>
      </div>
    </section>
  );
}

/**
 * The top of the card, laid out like an ID photo: the agent on its dither, the labels around it, and a
 * code to scan that starts an email to it, as on the onboarding's card.
 */
function Portrait({ handle, address, pictureUrl, state }: IdentityCardProps) {
  const beaming = useBeaming(state !== 'paused');

  return (
    <div className="relative isolate h-52.5 overflow-hidden bg-subtle">
      {/* `Deco/Callout dither` at 55%, its left edge 220px out of the card. */}
      <img
        src="/illustrations/dither-callout.svg"
        alt=""
        width={560}
        height={320}
        className="pointer-events-none absolute top-0 -left-55 -z-10 h-80 w-140 max-w-none opacity-55 select-none"
      />
      {/* What shows of `Deco/Corner ticks`: the corner the card's rounding doesn't cut away. */}
      <span aria-hidden="true" className="absolute bottom-0 left-0 h-px w-1.25 bg-border-strong" />
      <span aria-hidden="true" className="absolute bottom-0 left-0 h-1.25 w-px bg-border-strong" />

      <p className="absolute top-3.5 left-4 font-mono text-[10px] leading-3.5 font-medium tracking-[0.8px] text-muted">
        AGENT CARD
      </p>
      <p className="absolute top-3 right-3 flex items-center gap-1.5 rounded bg-background/70 px-2 py-0.75 font-mono text-[11px] leading-3.5 text-default">
        <Dot className={STATE_DOT[state]} />
        {state}
      </p>

      {/*
        The picture the operator gave the agent, or the mascot as on the onboarding's card: it follows the
        pointer, blinks, and beams now and then; a paused agent sleeps. It is drawn 120px across, the size of
        its grid, centred where the design's 132px drawing is: at any other size one eye comes out wider.
      */}
      {pictureUrl ? (
        <AgentAvatar src={pictureUrl} still className="absolute top-10 left-26 size-33 rounded-full" />
      ) : (
        <MascotFace
          art="waiting"
          mood={state === 'paused' ? 'asleep' : beaming ? 'happy' : 'awake'}
          ahead
          className="absolute top-11.5 left-27.5 size-30"
        />
      )}

      <p className="absolute bottom-2 left-4 max-w-55 truncate font-mono text-[10px] leading-3.5 text-muted">
        fig. {handle}
      </p>
      {/* Light on the dark portrait, 44px, 16px from the right and 14px from the bottom; only with an address. */}
      {address && (
        <QRCode
          value={`mailto:${address}`}
          size={44}
          level="L"
          bgColor="transparent"
          fgColor="#ebe2d6"
          aria-label={`QR code that starts an email to ${address}`}
          className="absolute right-4 bottom-3.5"
        />
      )}
    </div>
  );
}

type CardLineProps = {
  icon: ReactNode;
  label: string;
  /** Whether this part of the agent works yet. What doesn't is written in a quieter color. */
  live?: boolean;
  /** The line of the host, which the design sets apart. */
  highlighted?: boolean;
  /** What ends the line: its copy button, or a dot for how it stands. */
  end: ReactNode;
};

function CardLine({ icon, label, live = true, highlighted = false, end }: CardLineProps) {
  return (
    <li className={cn('flex h-8.5 items-center gap-2.5 rounded-md px-2', highlighted && 'bg-subtle')}>
      {icon}
      <span
        className={cn('min-w-0 flex-1 truncate font-mono text-xs leading-4', live ? 'text-foreground' : 'text-muted')}
      >
        {label}
      </span>
      {end}
    </li>
  );
}

function CopyLine({ value, label }: { value: string; label: string }) {
  return (
    <CopyButton
      value={value}
      label={label}
      className="size-4 shrink-0 rounded-sm text-muted hover:bg-transparent hover:text-foreground"
      iconClassName="size-3"
    />
  );
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('size-1.5 shrink-0 rounded-full', className)} />;
}

/** The empty ring at the end of a line that has nothing to show yet. */
function Pending() {
  return <span aria-hidden="true" className="size-1.75 shrink-0 rounded-full border-[1.2px] border-muted" />;
}
