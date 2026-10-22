'use client';

import { useLayoutEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

import { useHeroMotion, useHeroTimer } from './hero-motion';

/**
 * Word swap, timed against the designer's reference video (60fps): the outgoing
 * word blurs and fades in place, the pill (fill and word) softens, the incoming
 * word rises from below the pill's clipped bottom edge, and the pill eases to the
 * new word's width. The line stays centred, so "The" and "inbox" each move by
 * half of the width change, in step with the resize.
 */
// Fitted to the video's frame-by-frame positions and brightness (≤1px RMS).
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

/**
 * Pill geometry in em of the line's font size, from Figma: 92×34 at y −1 around
 * the 28px "E-mail" on mobile, 104×37 at y 1 around the 32px one on desktop.
 * Its horizontal insets from the word aren't symmetric in either design.
 */
const pillY = 'top-[-0.035714em] h-[1.214286em] sm:top-[0.03125em] sm:h-[1.15625em]';
const pillBox = cn(
  pillY,
  '-right-[0.324777em] -left-[0.234933em] rounded-[0.285714em] sm:-right-[0.27978515625em] sm:-left-[0.244140625em] sm:rounded-[0.3125em]'
);
/** Words sit on the slot's line box, inside a clip box shaped like the pill. */
const wordTop = 'top-[0.035714em] sm:top-[-0.03125em]';

/**
 * Figma fills the line with a radial gradient (#eee5d8 → transparent). The word
 * animates (opacity, filter, transform), which background-clip: text would skip,
 * so the same gradient is applied as a mask over solid text instead.
 */
const textMask = '[mask-image:radial-gradient(ellipse_112.9%_319.8%_at_50%_107.29%,#000_19.722%,transparent_85.698%)]';

export function HeroTitleLine({
  lead,
  words,
  rest,
  interval,
  className,
}: {
  lead: string;
  /** Pill words in order; the first one is the static, server-rendered state. */
  words: readonly string[];
  rest: string;
  interval: number;
  className?: string;
}) {
  const { reducedMotion } = useHeroMotion();
  // Only the current word and the one it replaced are rendered, so hidden words
  // never stick out of the title (e.g. when it wraps under enlarged text spacing).
  const [swap, setSwap] = useState({ index: 0, from: 0 });
  const { index, from } = swap;
  useHeroTimer(interval, index, () =>
    setSwap((current) => ({
      index: (current.index + 1) % words.length,
      from: current.index,
    }))
  );
  const pill = useRef<HTMLSpanElement>(null);
  const pillSlot = useRef<HTMLSpanElement>(null);
  const textSlot = useRef<HTMLSpanElement>(null);
  const items = useRef<(HTMLSpanElement | null)[]>([]);
  const animated = useRef(swap);

  // Rest styles already show the new word; these animations run from the old one.
  // None of them fill forwards, so no filter or size lingers once they finish.
  useLayoutEffect(() => {
    if (animated.current === swap) return;
    animated.current = swap;
    const outgoing = items.current[swap.from];
    const incoming = items.current[swap.index];
    if (!outgoing || !incoming) return;
    const slots = [pillSlot.current, textSlot.current];
    for (const element of [outgoing, incoming, pill.current, ...slots])
      for (const animation of element?.getAnimations() ?? []) animation.cancel();
    if (reducedMotion) return;

    // The centred line follows the slots' width, so it re-centres as they resize.
    const fromWidth = outgoing.getBoundingClientRect().width;
    const toWidth = incoming.getBoundingClientRect().width;
    const resize = { duration: RESIZE_MS, easing: RESIZE_EASE };
    for (const slot of slots) slot?.animate({ width: [`${fromWidth}px`, `${toWidth}px`] }, resize);
    const blur = [{ filter: 'blur(0px)' }, { filter: `blur(${BLUR_PX}px)`, offset: 0.35 }, { filter: 'blur(0px)' }];
    pill.current?.animate(blur, { duration: BLUR_MS, easing: 'ease-in-out' });
    textSlot.current?.animate(blur, {
      duration: BLUR_MS,
      easing: 'ease-in-out',
    });
    outgoing.animate(
      [
        { opacity: 1, filter: 'blur(0px)' },
        { opacity: 0, filter: `blur(${LEAVE_BLUR_PX}px)` },
      ],
      { duration: LEAVE_MS, easing: 'linear' }
    );
    // The rise and the reveal run on separate curves: the word lands with a long
    // ease-out tail while its fade and blur clear sooner.
    incoming.animate([{ transform: `translateY(${RISE_OFFSET})` }, { transform: 'translateY(0)' }], {
      duration: RISE_MS,
      delay: RISE_DELAY_MS,
      easing: RISE_EASE,
      fill: 'backwards',
    });
    incoming.animate(
      [
        { opacity: 0, filter: `blur(${REVEAL_BLUR_PX}px)` },
        { opacity: 1, filter: 'blur(0px)' },
      ],
      {
        duration: REVEAL_MS,
        delay: REVEAL_DELAY_MS,
        easing: 'ease-out',
        fill: 'backwards',
      }
    );
  }, [swap, reducedMotion]);

  const word = words[index];
  return (
    <span data-word={word} className={cn('relative block', className)}>
      {/* The pill's fill: a transparent copy of the line places it under the word. */}
      <span aria-hidden="true" className="absolute inset-0 whitespace-pre-wrap text-transparent">
        {`${lead}  `}
        {/* nowrap: while the slot animates narrower than its word, "E-mail" would
            otherwise break at its hyphen and lift the pill a line up. */}
        <span ref={pillSlot} className="relative inline-block whitespace-nowrap">
          <span ref={pill} className={cn('absolute bg-border', pillBox)} />
          {word}
        </span>
        {`  ${rest}`}
      </span>
      <span className={cn('relative whitespace-pre-wrap text-sapien-foreground', textMask)}>
        {`${lead}  `}
        {/* Assistive technology always reads the Figma title. Placed before the
            slot so its clipped text never reaches past the visible word. */}
        <span className="sr-only">{words[0]}</span>
        <span ref={textSlot} aria-hidden="true" className="relative inline-block whitespace-nowrap">
          <span className="invisible">{word}</span>
          <span className={cn('absolute -inset-x-[0.35em] overflow-hidden', pillY)}>
            {words.map((item, itemIndex) => (
              <span
                key={item}
                ref={(element) => {
                  items.current[itemIndex] = element;
                }}
                className={cn('absolute left-[0.35em] whitespace-pre', wordTop)}
                hidden={itemIndex !== index && itemIndex !== from}
                style={{ opacity: itemIndex === index ? 1 : 0 }}
              >
                {item}
              </span>
            ))}
          </span>
        </span>
        {`  ${rest}`}
      </span>
    </span>
  );
}
