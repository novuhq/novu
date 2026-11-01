'use client';

import { type ReactNode, useLayoutEffect, useRef, useState } from 'react';

import { CHANNEL_NAMES, ChannelTile } from '@/components/sapien/brand-logo';
import { HERO_AGENTS, HERO_CHANNELS, HERO_SWAP_INTERVAL, HERO_TITLE } from '@/data/sapien-hero';
import { hostOf } from '@/lib/hosts';
import { cn } from '@/lib/utils';

import { useHeroMotion, useHeroTimer } from './hero-motion';

type Token = { name: string; logo: ReactNode };

/**
 * The original title's word swap, timed against the designer's reference video (60fps): the outgoing
 * word blurs and fades in place, the pill (fill and word) softens, the incoming word rises from below
 * the pill's clipped bottom edge, and the pill eases to the new word's width.
 */
const RESIZE_MS = 660;
const RESIZE_EASE = 'cubic-bezier(0.5, 0, 0.2, 1)';
const BLUR_MS = 380;
const BLUR_PX = 3;
const LEAVE_MS = 220;
const LEAVE_BLUR_PX = 8;
const RISE_DELAY_MS = 230;
const RISE_MS = 500;
const RISE_EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
const RISE_OFFSET = '0.875em';
const REVEAL_DELAY_MS = 130;
const REVEAL_MS = 400;
const REVEAL_BLUR_PX = 2;
/** The channel pill follows the agent pill by a beat, so the line never swaps as one block. */
const CHANNEL_DELAY_MS = 140;

/** Pill height and offset from the original title: 37px at y 1 around the 32px word. */
const pillBox = 'top-[0.03125em] h-[1.15625em] rounded-[0.3125em]';
/** Logos are drawn at 32px and zoomed to 24px (21px on phones). */
const logoFrame = 'mr-[0.25em] shrink-0 [zoom:0.65625] sm:[zoom:0.75]';
/** Trims the word to its caps and baseline, so the pill centres logo and word on the same line. */
const capBox = 'leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]';
const tile = 'relative block size-8 overflow-hidden rounded-[7px]';
const tileEdge = 'absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset';

const agentTokens: Token[] = HERO_AGENTS.map((id) => {
  const host = hostOf(id);

  return {
    name: host.name,
    logo: (
      <span className={tile}>
        <img src={host.icon ?? ''} alt="" className="size-full" />
        <span className={tileEdge} />
      </span>
    ),
  };
});

const channelTokens: Token[] = HERO_CHANNELS.map((channel) => ({
  name: CHANNEL_NAMES[channel],
  logo: <ChannelTile channel={channel} size={32} />,
}));

const listOf = (tokens: Token[]) => {
  const names = tokens.map((token) => token.name);

  return `${names.slice(0, -1).join(', ')} or ${names.at(-1)}`;
};

const HEADLINE_LABEL = `${HERO_TITLE.lead} ${listOf(agentTokens)} ${HERO_TITLE.middle} ${listOf(channelTokens)} ${HERO_TITLE.accent}.`;

/** The words between the names: quieter, so a skim reads agent, channel, then the accent. */
const connector = 'text-sapien-foreground/55';

function HeroPill({ kind, tokens, step, delay = 0 }: { kind: string; tokens: Token[]; step: number; delay?: number }) {
  const { reducedMotion } = useHeroMotion();
  const index = step % tokens.length;
  const from = step === 0 ? index : (step - 1) % tokens.length;
  const slot = useRef<HTMLSpanElement>(null);
  const fill = useRef<HTMLSpanElement>(null);
  const clip = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const animated = useRef(step);

  // Rest styles already show the new word; these animations run from the old one.
  // None of them fill forwards, so no filter or width lingers once they finish.
  useLayoutEffect(() => {
    if (animated.current === step) return;
    animated.current = step;
    const outgoing = items.current[from];
    const incoming = items.current[index];
    if (!slot.current || !outgoing || !incoming) return;
    for (const element of [slot.current, fill.current, clip.current, outgoing, incoming])
      for (const animation of element?.getAnimations() ?? []) animation.cancel();
    if (reducedMotion) return;

    const padding = slot.current.getBoundingClientRect().width - incoming.getBoundingClientRect().width;
    const fromWidth = outgoing.getBoundingClientRect().width + padding;
    const toWidth = incoming.getBoundingClientRect().width + padding;
    slot.current.animate(
      { width: [`${fromWidth}px`, `${toWidth}px`] },
      { duration: RESIZE_MS, delay, easing: RESIZE_EASE, fill: 'backwards' }
    );
    const blur = [{ filter: 'blur(0px)' }, { filter: `blur(${BLUR_PX}px)`, offset: 0.35 }, { filter: 'blur(0px)' }];
    for (const element of [fill.current, clip.current])
      element?.animate(blur, { duration: BLUR_MS, delay, easing: 'ease-in-out' });
    outgoing.animate(
      [
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: `blur(${LEAVE_BLUR_PX}px)` },
      ],
      { duration: LEAVE_MS, delay, easing: 'linear', fill: 'backwards' }
    );
    // The rise and the reveal run on separate curves: the word lands with a long
    // ease-out tail while its fade and blur clear sooner.
    incoming.animate([{ transform: `translateY(${RISE_OFFSET})` }, { transform: 'translateY(0)' }], {
      duration: RISE_MS,
      delay: delay + RISE_DELAY_MS,
      easing: RISE_EASE,
      fill: 'backwards',
    });
    incoming.animate(
      [
        { opacity: 0, filter: `blur(${REVEAL_BLUR_PX}px)` },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      { duration: REVEAL_MS, delay: delay + REVEAL_DELAY_MS, easing: 'ease-out', fill: 'backwards' }
    );
  }, [step, index, from, delay, reducedMotion]);

  const current = tokens[index];

  return (
    <span
      ref={slot}
      data-token={kind}
      data-current={current.name}
      className="relative inline-block px-[0.25em] text-left whitespace-nowrap"
    >
      <span ref={fill} className={cn('absolute inset-x-0 bg-sapien-border', pillBox)} />
      <span className="invisible">
        <span className={cn(logoFrame, 'inline-block align-middle')}>{current.logo}</span>
        {current.name}
      </span>
      <span ref={clip} className={cn('absolute inset-x-0 overflow-hidden', pillBox)}>
        {tokens.map((token, tokenIndex) => (
          <span
            key={token.name}
            ref={(element) => {
              items.current[tokenIndex] = element;
            }}
            hidden={tokenIndex !== index && tokenIndex !== from}
            className="absolute inset-y-0 left-[0.25em] flex items-center whitespace-pre"
            style={{ opacity: tokenIndex === index ? 1 : 0 }}
          >
            <span className={logoFrame}>{token.logo}</span>
            <span className={capBox}>{token.name}</span>
          </span>
        ))}
      </span>
    </span>
  );
}

export function HeroHeadline() {
  const [step, setStep] = useState(0);
  useHeroTimer(HERO_SWAP_INTERVAL, step, () => setStep((current) => current + 1));

  return (
    <h1 aria-label={HEADLINE_LABEL} className="flex w-full min-w-0 flex-col items-center gap-3 font-normal sm:gap-3.5">
      {/* Widest pair is about 18.6em, the accent about 10.4em. Both are sized from the column so they
          stay one line, and about the same width, down to a phone. */}
      <span
        aria-hidden="true"
        className="block animate-sapien-in text-center text-[min(36px,calc(100cqw/20.5))] leading-[1.2] tracking-[-0.04em] text-sapien-foreground motion-reduce:animate-none"
      >
        <span className={connector}>{`${HERO_TITLE.lead} `}</span>
        <HeroPill kind="agent" tokens={agentTokens} step={step} />
        <span className={connector}>{` ${HERO_TITLE.middle} `}</span>
        <HeroPill kind="channel" tokens={channelTokens} step={step} delay={CHANNEL_DELAY_MS} />
      </span>
      <span
        aria-hidden="true"
        className="block animate-sapien-in text-center font-sapien-display text-[min(56px,calc(100cqw/11.6))] leading-none tracking-[-0.03em] text-accent italic [animation-delay:90ms] [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] motion-reduce:animate-none"
      >
        {HERO_TITLE.accent}
      </span>
    </h1>
  );
}
