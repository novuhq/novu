'use client';

import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { HeroRelation } from '@/data/sapien-hero';

import { cn } from '@/lib/utils';

import intro from './hero-intro.module.css';
import { useHeroMotion, useHeroTimer } from './hero-motion';

/**
 * Stack slots from Figma (relative to the front card's top-left): the two back
 * cards are 346 and 322 wide, 17 and 32px higher, centred on the front card.
 *
 * Slots are sized with a real width and a translate-only transform: Chrome
 * skips a backdrop-filter's view of sibling cards when the filtered element
 * sits inside a scale() transform, which left the back card's outline sharp
 * behind the middle card instead of Figma's blur.
 *
 * The back slots hold blank shells, and the card faces all sit in the front
 * slot. The last slot is where a new back shell comes from when the stack
 * advances; it's empty at rest. The front slot's stroke is what the middle
 * shell's outline brightens to as it comes forward (a card face covers it).
 */
const SLOTS = [
  { x: 0, y: 0, width: 365, z: 3, stroke: 0.15 },
  { x: 10, y: -17, width: 346, z: 2, stroke: 0.09 },
  { x: 22, y: -32, width: 322, z: 1, stroke: 0.013 },
  { x: 34, y: -50, width: 297, z: 0, stroke: 0 },
] as const;
/** The shells' height (the Agent ID and call cards); the stack's fade hides their bottoms. */
const SHELL_HEIGHT = 386;
type Slot = (typeof SLOTS)[number];
const position = ({ x, y }: Slot) => `translate(${x}px, ${y}px)`;

/**
 * Card swap, sampled frame by frame from the designer's video: the front card
 * sinks with growing speed while it blurs and fades out, and the stack behind
 * it advances one slot: the middle shell slides into the front slot, carrying
 * the next card, which fades in sharp; the back shell takes the middle slot and
 * a new one fades in from above into the back slot. Once the next card is
 * opaque, every shell snaps back to its own slot, which looks the same. None of
 * the animations fill forwards, so no filter is left on a card at rest.
 */
const LEAVE_MS = 650;
/** [time in ms, drop in px, blur in px, opacity] */
const LEAVE_FRAMES = [
  [0, 0, 0, 1],
  [50, 0.3, 0, 1],
  [100, 4, 0.5, 1],
  [150, 12, 2.5, 0.98],
  [200, 27, 5, 0.93],
  [250, 44, 8, 0.85],
  [300, 60, 12, 0.76],
  [350, 75, 15.5, 0.74],
  [400, 87, 18, 0.64],
  [450, 96, 20, 0.5],
  [500, 103, 22, 0.38],
  [550, 108, 23.5, 0.25],
  [600, 111, 24.5, 0.12],
  [650, 113, 25, 0],
] as const;
const ENTER_DELAY_MS = 300;
const ENTER_MS = 430;
const EASE_OUT_CUBIC = 'cubic-bezier(0.33, 1, 0.68, 1)';
const ADVANCE_DELAY_MS = 130;
const ADVANCE_MS = 580;
const ADVANCE_EASE = 'cubic-bezier(0.1, 0.05, 0.15, 1)';
/** The new back shell fades in over this span, in ms from the swap's start. */
const NEW_SHELL_FADE = [245, 400] as const;
/** Shells hold their advanced slots until the next card is opaque. */
const SWAP_MS = ENTER_DELAY_MS + ENTER_MS;
/** Every card's shadow; the middle shell's fades to the clear one under the next card. */
const SHADOW = '0 -3.177px 15.885px rgb(0 0 0 / 0.45)';
const SHADOW_CLEAR = '0 -3.177px 15.885px rgb(0 0 0 / 0)';

/** Keyframes over the whole swap that move from one state to another on the advance curve. */
const advance = (from: Keyframe, to: Keyframe): Keyframe[] => [
  { ...from, offset: 0 },
  { ...from, offset: ADVANCE_DELAY_MS / SWAP_MS, easing: ADVANCE_EASE },
  { ...to, offset: (ADVANCE_DELAY_MS + ADVANCE_MS) / SWAP_MS },
  { ...to, offset: 1 },
];
const slotFrame = (slot: Slot): Keyframe => ({
  transform: position(slot),
  width: `${slot.width}px`,
});

export type HeroStageProps = {
  /** Server-rendered card faces, in rotation order. */
  cards: readonly ReactNode[];
  relations: readonly HeroRelation[];
  interval: number;
  label: string;
  description: string;
  caption: string;
  states: { playing: string; paused: string };
  /** Decorative layers drawn behind and in front of the stack, in 960×783 design space. */
  backdrop: ReactNode;
  foreground: ReactNode;
  /** Alpha mask over the stack, as CSS mask-image / mask-size / mask-position. */
  stackMask: { image: string; size: string; position: string };
};

export function HeroStage({
  cards,
  relations,
  interval,
  label,
  description,
  caption,
  states,
  backdrop,
  foreground,
  stackMask,
}: HeroStageProps) {
  const count = cards.length;
  const [active, setActive] = useState(0);
  const { paused, rotating, reducedMotion, toggle, hold } = useHeroMotion();
  useHeroTimer(interval, active, () => setActive((index) => (index + 1) % count));
  const figure = useRef<HTMLElement>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const shells = useRef<(HTMLDivElement | null)[]>([]);
  const strokes = useRef<(HTMLSpanElement | null)[]>([]);
  const previous = useRef(active);

  // Hold while keyboard focus is anywhere in the hero (copy controls included).
  // Focus on the toggle itself doesn't count, so a clicked "Play" takes effect
  // immediately.
  useEffect(() => {
    const section = figure.current?.closest('section');
    if (!section) return;
    const onFocusIn = (event: FocusEvent) => {
      const target = event.target as Element;
      hold('focus', target !== toggleButton.current && target.matches(':focus-visible'));
    };
    const onFocusOut = (event: FocusEvent) => {
      if (!section.contains(event.relatedTarget as Node | null)) hold('focus', false);
    };
    section.addEventListener('focusin', onFocusIn);
    section.addEventListener('focusout', onFocusOut);
    return () => {
      section.removeEventListener('focusin', onFocusIn);
      section.removeEventListener('focusout', onFocusOut);
    };
  }, [hold]);

  // Inline styles already show the new card; these animations run from the old one.
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = active;
    const leaving = items.current[from];
    const entering = items.current[active];
    if (from === active || reducedMotion || !leaving || !entering) return;
    for (const element of [leaving, entering, ...shells.current, ...strokes.current])
      for (const animation of element?.getAnimations() ?? []) animation.cancel();
    leaving.animate(
      LEAVE_FRAMES.map(([time, drop, blur, opacity]) => ({
        offset: time / LEAVE_MS,
        transform: `translateY(${drop}px)`,
        filter: `blur(${blur}px)`,
        opacity,
        visibility: 'visible',
        zIndex: 4,
      })),
      { duration: LEAVE_MS }
    );
    entering.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: ENTER_MS,
      delay: ENTER_DELAY_MS,
      easing: EASE_OUT_CUBIC,
      fill: 'backwards',
    });
    // The next card rides the middle shell into the front slot (scaled from
    // its top centre, so its edges follow the shell's).
    const [front, middle] = SLOTS;
    entering.animate(
      advance(
        {
          transform: `translateY(${middle.y}px) scale(${middle.width / front.width})`,
        },
        { transform: 'translateY(0px) scale(1)' }
      ),
      { duration: SWAP_MS }
    );
    shells.current.forEach((shell, index) => {
      const [to, from] = [SLOTS[index], SLOTS[index + 1]];
      shell?.animate(advance(slotFrame(from), slotFrame(to)), {
        duration: SWAP_MS,
      });
      strokes.current[index]?.animate(advance({ opacity: from.stroke }, { opacity: to.stroke }), { duration: SWAP_MS });
    });
    // Under the next card the middle shell's own shadow would darken the cards
    // behind on top of the card's; it fades out as the card fades in.
    shells.current[0]?.animate(
      [
        { boxShadow: SHADOW },
        {
          boxShadow: SHADOW,
          offset: ENTER_DELAY_MS / SWAP_MS,
          easing: EASE_OUT_CUBIC,
        },
        { boxShadow: SHADOW_CLEAR },
      ],
      { duration: SWAP_MS }
    );
    const [fadeStart, fadeEnd] = NEW_SHELL_FADE;
    shells.current.at(-1)?.animate(
      [
        { opacity: 0, visibility: 'visible' },
        { opacity: 0, visibility: 'visible', offset: fadeStart / SWAP_MS },
        { opacity: 1, visibility: 'visible', offset: fadeEnd / SWAP_MS },
        { opacity: 1, visibility: 'visible' },
      ],
      { duration: SWAP_MS }
    );
  }, [active, reducedMotion]);

  const relation = relations[active];
  return (
    <figure
      ref={figure}
      aria-label={label}
      // Mobile Figma (340px section): the stack's front card starts 117px below
      // the controls, and the caption bar sits 4px above the section's bottom.
      // round() keeps the section height a whole number of pixels.
      className="mt-auto pt-[calc(var(--hero-scale,1)*432px+73px)] supports-[top:round(1px,1px)]:pt-[round(calc(var(--hero-scale,1)*432px+73px),1px)] sm:pt-0"
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* zoom rather than a scale() transform: a scaled ancestor also stops the
            back shells' backdrop-filter from blurring the card behind them. */}
        <div className="absolute bottom-0 left-1/2 h-[783px] w-[960px] -translate-x-1/2 [zoom:var(--hero-scale,1)]">
          {backdrop}
          {/* The stack itself isn't masked: a masked ancestor also hides sibling
              cards from backdrop-filter. Instead the backdrop is drawn again on
              top through the inverted mask, which composites to the same result. */}
          <div className="absolute inset-0 isolate">
            <div
              className={cn('pointer-events-auto absolute top-[351px] left-[297px] h-[427px] w-[365px]', intro.stack)}
              onPointerEnter={() => hold('hover', true)}
              onPointerLeave={() => hold('hover', false)}
            >
              {/* The blur sits on the shell itself: the intro fades each card on
                  its own, and an element's own opacity doesn't hide what's
                  behind it from its backdrop-filter (a fading ancestor would). */}
              {SLOTS.slice(1).map((slot, index) => (
                <div
                  key={slot.width}
                  ref={(element) => {
                    shells.current[index] = element;
                  }}
                  className="absolute top-0 left-0 rounded-[19.062px] bg-[rgb(56_54_51/0.5)] backdrop-blur-[7.94px]"
                  style={{
                    transform: position(slot),
                    boxShadow: SHADOW,
                    width: slot.width,
                    height: SHELL_HEIGHT,
                    zIndex: slot.z,
                    // The new back shell only shows while the stack advances.
                    ...(slot === SLOTS[3] && {
                      opacity: 0,
                      visibility: 'hidden',
                    }),
                  }}
                >
                  <span
                    ref={(element) => {
                      strokes.current[index] = element;
                    }}
                    className="absolute inset-0 rounded-[inherit] border border-white"
                    style={{ opacity: slot.stroke }}
                  />
                </div>
              ))}
              {cards.map((card, index) => (
                <div
                  key={index}
                  ref={(element) => {
                    items.current[index] = element;
                  }}
                  className="absolute top-0 left-0 w-[365px] origin-top rounded-[19.062px]"
                  style={{
                    boxShadow: SHADOW,
                    zIndex: SLOTS[0].z,
                    opacity: index === active ? 1 : 0,
                    visibility: index === active ? 'visible' : 'hidden',
                  }}
                >
                  {card}
                </div>
              ))}
            </div>
          </div>
          <div
            className="absolute inset-0 bg-black"
            style={{
              maskImage: `linear-gradient(#000, #000), url(${stackMask.image})`,
              maskRepeat: 'no-repeat',
              maskSize: `100% 100%, ${stackMask.size}`,
              maskPosition: `0 0, ${stackMask.position}`,
              maskComposite: 'exclude',
            }}
          >
            {backdrop}
          </div>
          <div className={cn('absolute inset-0', intro.arms)}>{foreground}</div>
        </div>
      </div>
      <p className="sr-only">{description}</p>
      <figcaption className="relative z-10 mx-1 mb-1 flex min-h-10 flex-wrap items-center justify-between gap-x-1.5 gap-y-2 rounded-md bg-black py-2 pr-3 pl-2 font-mono text-xs leading-none tracking-tight sm:mx-[9px] sm:mb-2 sm:min-h-[50px] sm:gap-x-3 sm:px-[18px] sm:py-0 sm:text-[13px]">
        <button
          ref={toggleButton}
          type="button"
          onClick={toggle}
          aria-label={`${caption} — ${paused ? states.paused : states.playing}, ${rotating ? 'Pause' : 'Play'} animation`}
          className="cursor-pointer rounded-sm text-sapien-foreground/50 transition-colors duration-150 hover:text-accent motion-reduce:transition-none"
        >
          {caption}
          <span className="max-sm:hidden"> — {paused ? states.paused : states.playing}</span>
        </button>
        <span aria-hidden="true" className="ml-auto text-sapien-foreground">
          [ agent <span className="text-sapien-foreground/20">→</span>{' '}
          <span className="text-accent">{relation.verb}</span> <span className="text-sapien-foreground/20">→</span>{' '}
          {relation.object} ]
        </span>
      </figcaption>
    </figure>
  );
}
