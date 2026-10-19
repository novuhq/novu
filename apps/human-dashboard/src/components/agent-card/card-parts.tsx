'use client';

import type { ReactNode } from 'react';
import QRCode from 'react-qr-code';

import { ShortDate } from '@/app/(account)/(dashboard)/contacts/short-date';
import { AgentAvatar } from '@/components/ui/agent-avatar';
import { CopyButton } from '@/components/ui/copy-button';
import { MascotFace, useBeaming } from '@/components/ui/mascot-face';
import { type AgentState, qrValueOf } from '@/lib/agent-card';
import { cn } from '@/lib/utils';

/*
 * The parts of the agent's ID card (`Agent ID card` in the design), shared by the operator's card on the
 * Configure page and the public card anyone can open at `agentinbox.md/p/{handle}`.
 */

export type { AgentState };

const STATE_DOT: Record<AgentState, string> = {
  active: 'bg-success',
  // Amber while no host reads its mail, as the onboarding's "setup not finished" frame draws it.
  waiting: 'bg-warning',
  paused: 'bg-muted',
};

type CardPortraitProps = {
  handle: string;
  /** The agent's email address, which the code to scan starts an email to. No code without one. */
  address: string | null;
  pictureUrl?: string;
  state: AgentState;
};

/**
 * The top of the card, laid out like an ID photo: the agent on its dither, the labels around it, and a
 * code to scan that starts an email to it, as on the onboarding's card.
 */
export function CardPortrait({ handle, address, pictureUrl, state }: CardPortraitProps) {
  const beaming = useBeaming(state !== 'paused');

  return (
    <div className="relative isolate h-52.5 overflow-hidden bg-subtle">
      {/* `Deco/Callout dither` at 55%, its right edge 2px out of the card. */}
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
        <StateDot className={STATE_DOT[state]} />
        {/* A new key when the agent's state changes, so the new word fades in. */}
        <span key={state} className="animate-overlay-in motion-reduce:animate-none">
          {state}
        </span>
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
          value={qrValueOf(address)}
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

type CardNameProps = {
  name: string;
  /** Who runs the agent: the operator's full name, or empty when there is none. */
  operatorName: string;
  createdAt?: string;
};

/** The agent's name under its portrait, and who runs it since when: "Run by Dima Grossman · issued Oct 3". */
export function CardName({ name, operatorName, createdAt }: CardNameProps) {
  return (
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
  );
}

type CardLineProps = {
  icon: ReactNode;
  label: string;
  /** Whether this part of the agent works yet. What doesn't is written in a quieter color. */
  live?: boolean;
  /** The line of the host, which the design sets apart. */
  highlighted?: boolean;
  /** Fades the words in anew when they change, for a line that changes while the page is open. */
  fades?: boolean;
  /** What ends the line: its copy button, or a dot for how it stands. */
  end: ReactNode;
};

/** One way to reach the agent, or the host behind it: a line of the card. */
export function CardLine({ icon, label, live = true, highlighted = false, fades = false, end }: CardLineProps) {
  return (
    <li className={cn('flex h-8.5 items-center gap-2.5 rounded-md px-2', highlighted && 'bg-subtle')}>
      {icon}
      <span
        key={fades ? label : undefined}
        className={cn(
          'min-w-0 flex-1 truncate font-mono text-xs leading-4',
          live ? 'text-foreground' : 'text-muted',
          fades && 'animate-overlay-in motion-reduce:animate-none'
        )}
      >
        {label}
      </span>
      {end}
    </li>
  );
}

/** The bare 12px copy icon at the end of a line, with no button drawn around it. */
export function CopyLine({ value, label }: { value: string; label: string }) {
  return (
    <CopyButton
      value={value}
      label={label}
      className="size-4 shrink-0 rounded-sm text-muted hover:bg-transparent hover:text-foreground"
      iconClassName="size-3"
    />
  );
}

export function StateDot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-1.5 shrink-0 rounded-full transition-colors duration-200 motion-reduce:transition-none',
        className
      )}
    />
  );
}

/** The empty ring at the end of a line that has nothing to show yet. */
export function Pending() {
  return <span aria-hidden="true" className="size-1.75 shrink-0 rounded-full border-[1.2px] border-muted" />;
}
