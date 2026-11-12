'use client';

import { type ReactNode, useId } from 'react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { MascotFace } from '@/components/ui/mascot-face';
import { MorphingText } from '@/components/ui/morphing-text';
import { type AgentLook, artColorOf } from '@/lib/look';
import { cn } from '@/lib/utils';

import { CardArt } from './card-art';

/**
 * A length on the card, in the design's measures for a card 300px wide (`Agent card · Vertical`), scaled to the
 * card's width: the onboarding draws it 339.13px wide, as the design does, and a narrow window smaller.
 */
function u(length: number): string {
  return `calc(${length} * 100cqw / 300)`;
}

/** The card's ink: its label, serial and name. */
const INK = 'text-[#d8e7ea]';

type AgentCardVerticalProps = {
  look: AgentLook;
  name: string;
  /** The line under the name: "Not connected yet", or who runs the agent. */
  status: string;
  /** Its email address. */
  address: string;
  /** Its public card, as written on the card: `agentinbox.md/sid`. */
  link: string;
  /** Its number on the card, `0482`: see `cardSerialOf`. */
  serial: string;
  /** Where the mascot goes on the card: the onboarding's travelling mascot, or the card's own (`CardMascot`). */
  mascot: ReactNode;
  /** The picture the operator gave the agent, which the card shows in a ring in place of the mascot. */
  picture?: string;
  /** Its other ways in, each on a line of its own under the address once connected: a bot, a workspace. */
  lines?: { telegram?: string | null; slack?: string | null };
  /** Shown faint while the name or address is still a placeholder. */
  placeholder?: { name?: boolean; address?: boolean };
  className?: string;
};

/**
 * The agent card (`Agent card · Vertical`), drawn to the design's measures: its art across the top in the look's
 * colour, "Agent card" and its number above it, the mascot on the art's lower left, the name in italics, a line
 * about it, a dashed rule, its address, and its link at the foot.
 */
export function AgentCardVertical({
  look,
  name,
  status,
  address,
  link,
  serial,
  mascot,
  picture,
  lines = {},
  placeholder = {},
  className,
}: AgentCardVerticalProps) {
  const [red, green, blue] = artColorOf(look.color);

  return (
    <div className={cn('@container w-[339.13px] max-w-full', className)}>
      <article
        className="relative isolate aspect-[300/460] w-full overflow-hidden bg-[#110f0e]"
        style={{ borderRadius: u(18) }}
      >
        {/* The art's grid is the card's width in 100 columns; its rows run on past the art's own frame. */}
        <CardArt
          kind={look.art.kind}
          seed={look.art.seed}
          color={look.color}
          className="absolute inset-x-0 top-0 aspect-[100/84]"
        />
        {/* `Bevel`: a faint light along the top, inside the edge. */}
        <span
          aria-hidden="true"
          className="absolute bg-white/7"
          style={{ left: u(1), top: u(1), width: u(298), height: u(1) }}
        />
        <p
          className={cn('absolute font-mono font-medium uppercase', INK)}
          style={{ left: u(20), top: u(20), fontSize: u(9), lineHeight: u(12), letterSpacing: u(0.72) }}
        >
          Agent card
        </p>
        <p
          className={cn('absolute flex font-mono', INK)}
          style={{ left: u(236), top: u(20), fontSize: u(9), lineHeight: u(12) }}
        >
          No.&nbsp;
          <MorphingText text={serial} />
        </p>
        <div className="absolute flex flex-col" style={{ left: u(20), top: u(268), width: u(260), gap: u(4) }}>
          <h2
            className={cn(
              'truncate font-display italic transition-colors duration-200',
              placeholder.name ? 'text-muted' : INK
            )}
            style={{ fontSize: u(38), lineHeight: u(42) }}
          >
            {name}
          </h2>
          <p className="truncate text-secondary" style={{ fontSize: u(11), lineHeight: u(14) }}>
            {status}
          </p>
        </div>
        {/* The dashed rule: 2 on, 3 off. */}
        <span
          aria-hidden="true"
          className="absolute bg-[linear-gradient(to_right,var(--color-border-strong)_40%,transparent_40%)] bg-repeat-x"
          style={{ left: u(20), top: u(337.5), width: u(260), height: u(1), backgroundSize: `${u(5)} 100%` }}
        />
        <p
          className="absolute flex items-center font-mono text-default"
          style={{ left: u(20), top: u(352), maxWidth: u(260), gap: u(8), fontSize: u(11), lineHeight: u(14) }}
        >
          <EmailMark />
          <span className={cn('truncate transition-colors duration-200', placeholder.address && 'text-muted')}>
            {address}
          </span>
        </p>
        {/* The design's `Line · Telegram` and `Line · Slack`, which the onboarding's card leaves out. */}
        {lines.telegram && (
          <CardLine top={374} mark={<ChannelMarkOnCard via="telegram" />}>
            {lines.telegram}
          </CardLine>
        )}
        {lines.slack && (
          <CardLine top={lines.telegram ? 396 : 374} mark={<ChannelMarkOnCard via="slack" />}>
            {lines.slack}
          </CardLine>
        )}
        <p
          className="absolute truncate font-mono font-medium transition-colors duration-500"
          style={{
            left: u(20),
            top: u(432),
            maxWidth: u(260),
            fontSize: u(10),
            lineHeight: u(12),
            color: `rgb(${red} ${green} ${blue})`,
          }}
        >
          {link}
        </p>
        {picture ? (
          // The design's `Ring` with `Human/Mascot` inside it, which its card shows when there's a picture.
          <span
            className="absolute rounded-full border-solid border-border-strong bg-[#110f0e]"
            style={{ left: u(20), top: u(196), width: u(64), height: u(64), borderWidth: u(1), padding: u(5) }}
          >
            <img src={picture} alt="" className="size-full rounded-full object-cover" />
          </span>
        ) : (
          // `Card avatar`: over the art's lower left, in front of everything but the edge.
          <div className="absolute" style={{ left: u(6), top: u(168.73), width: u(109.69) }}>
            {mascot}
          </div>
        )}
        {/* The edge, over the art as the design draws it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border-solid border-border-strong"
          style={{ borderRadius: u(18), borderWidth: u(1) }}
        />
      </article>
    </div>
  );
}

/** One more way in on the card, under the address: a channel's logo and where the agent is found there. */
function CardLine({ top, mark, children }: { top: number; mark: ReactNode; children: ReactNode }) {
  return (
    <p
      className="absolute flex items-center font-mono text-default"
      style={{ left: u(20), top: u(top), maxWidth: u(260), gap: u(8), fontSize: u(11), lineHeight: u(14) }}
    >
      {mark}
      <span className="truncate">{children}</span>
    </p>
  );
}

/** Telegram's and Slack's round logos at the card's 12, their marks the share of the circle the dashboard's are. */
function ChannelMarkOnCard({ via }: { via: 'telegram' | 'slack' }) {
  return (
    <span aria-hidden="true" className="flex shrink-0" style={{ width: u(12), height: u(12) }}>
      <ChannelIcon
        via={via}
        className={via === 'telegram' ? 'size-full [&>svg]:size-[62.5%]' : 'size-full [&>svg]:size-[75%]'}
      />
    </span>
  );
}

/**
 * The card's own mascot, for a card shown on its own (the public card, Configure): the agent's look, awake, turning
 * towards the pointer and blinking. The onboarding puts its travelling mascot there instead.
 */
export function CardMascot({ look }: { look: AgentLook }) {
  return (
    <MascotFace
      art="avatar"
      look={{ shape: look.shape, color: look.color }}
      ahead
      drawnOnly
      className="aspect-square w-full"
    />
  );
}

/** The email line's `Channel logo`: the orange disc with a cream envelope and its blue flap, 12 of the card's 300. */
function EmailMark() {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');

  return (
    <svg
      viewBox="0 0 13.5652 13.5652"
      aria-hidden="true"
      className="shrink-0"
      fill="none"
      style={{ width: u(12), height: u(12) }}
    >
      <defs>
        <linearGradient id={`${id}-disc`} x1="6.783" y1="0" x2="6.783" y2="13.565" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ff7e52" />
          <stop offset="1" stopColor="#e5401a" />
        </linearGradient>
        <linearGradient id={`${id}-body`} x1="6.782" y1="4.24" x2="6.782" y2="9.327" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#fbede3" />
        </linearGradient>
      </defs>
      <circle cx="6.7826" cy="6.7826" r="6.7826" fill={`url(#${id}-disc)`} />
      <rect x="3.3906" y="4.3457" width="6.7826" height="4.875" rx="1.0174" fill={`url(#${id}-body)`} />
      <path
        d="m3.773 4.875 3.01 2.289 3.01-2.289"
        stroke="#29bfd6"
        strokeWidth="0.7207"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
