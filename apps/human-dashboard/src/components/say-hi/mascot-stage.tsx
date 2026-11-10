'use client';

import { motion, useIsPresent, useReducedMotion } from 'motion/react';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { MascotFace } from '@/components/ui/mascot-face';
import { LOOK_PALETTES, type LookColor, type MascotBody } from '@/lib/look';
import type { MascotMood } from '@/lib/mascot-sphere';
import { cn } from '@/lib/utils';

/**
 * Where the speech bubble sits, in shares of the mascot's size: its left edge from the mascot's left edge, and its
 * bottom edge, where the tail is, up from the mascot's bottom edge.
 */
export type BubblePlace = { left: number; bottom: number };

/** The design's two bubbles: A.1's, with 16px words, and the 15px one of the other screens. */
export type BubbleSize = 'large' | 'medium';

/**
 * The mascot's shadow on the ground, a soft dark oval under it: its left and top edges from the mascot's, and its
 * width, all in shares of the mascot's size.
 */
export type MascotShadow = { left: number; top: number; width: number };

/** How tall the shadow is, in shares of the mascot's size: the design's 18px under its 252px mascot. */
const SHADOW_HEIGHT = 18 / 252;

/** Where the mascot sits on a screen, what it says there and how it feels. */
type Slot = {
  element: HTMLElement;
  bubble?: string;
  mood: MascotMood;
  bubbleAt: BubblePlace;
  bubbleSize: BubbleSize;
  /** The design's set width for the bubble, where it has one: wider than its words, never narrower. */
  bubbleWidth?: number;
  /** Its shadow on this screen, if it has one. */
  shadow?: MascotShadow;
};

/** Where a screen has the glow behind it (`Depth / Spotlight`), and how strong it is there. */
type Spot = { element: HTMLElement; opacity: number };

/** A.2's bubble: over the mascot's top right quarter, its tail a sixth of the way down. */
const UPPER_RIGHT: BubblePlace = { left: 0.7361, bottom: 0.8433 };

/** How close to the window's edge a bubble may come before its words wrap. */
const BUBBLE_MARGIN = 16;

type StageApi = {
  show: (slot: Slot) => void;
  hide: (element: HTMLElement) => void;
  showSpot: (spot: Spot) => void;
  hideSpot: (element: HTMLElement) => void;
};

const StageContext = createContext<StageApi | null>(null);

/** The screen's glow, apart from the API so that a new one re-renders only the layer that draws it. */
const SpotContext = createContext<Spot | null>(null);

/** How long the mascot takes to glide from where it sat on one screen to where it sits on the next. */
const GLIDE = { type: 'spring', stiffness: 170, damping: 26, mass: 1 } as const;

/**
 * Why the mascot or the glow moved: to the next screen's place, which they glide to, or with the layout of the same
 * screen, a window resized or a page settling as it loads, which they keep to at once. Gliding then, they trailed
 * behind the screen as if they weren't part of it.
 */
type Moved = 'screen' | 'layout';

/** How long after arriving on a screen a moving layout is still the screen settling in, which they glide along with. */
const SETTLES_MS = 800;

/** Where something stands for a screen: the slot it is there for, since when, and whether it glides there. */
type Stand = { at: HTMLElement; since: number; glides: boolean };

/** Where the mascot is drawn, and how it got there. */
type Box = Stand & { x: number; y: number; size: number; room: number; width: number };

/** How a move to `at` goes, from where it stood `before`: a glide to another screen's slot, or a jump with the layout. */
function standAt(before: Stand | null, at: HTMLElement, moved: Moved): Stand {
  const now = performance.now();
  if (moved === 'screen' && before !== null && before.at !== at) {
    return { at, since: now, glides: true };
  }

  const since = before?.at === at ? before.since : now;

  return { at, since, glides: before?.at === at && before.glides && now - since < SETTLES_MS };
}

type MascotStageProps = {
  /** Its body and colour: the one being picked on A.1, then the agent's own. */
  look: { shape: MascotBody; color: LookColor };
  children: ReactNode;
  className?: string;
};

/**
 * The onboarding's one mascot. Every screen marks where the mascot sits on it with a `MascotSlot`, and this one
 * mascot glides from the slot of the screen before to the slot of this one, growing or shrinking as it goes, so
 * the agent being set up is the same one all the way through: it keeps its look, its pose and its face. A screen
 * without a slot has no mascot. For anyone who prefers reduced motion it moves at once.
 */
export function MascotStage({ look, children, className }: MascotStageProps) {
  const container = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<Slot | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [box, setBox] = useState<Box | null>(null);
  const reduced = useReducedMotion();
  // Where the shadow was last, so that on a screen without one it fades out where it was instead of jumping.
  const lastShadow = useRef<MascotShadow>({ left: 0.25, top: 0.88, width: 0.5 });
  if (slot?.shadow) {
    lastShadow.current = slot.shadow;
  }
  const shadow = lastShadow.current;

  const api = useMemo<StageApi>(
    () => ({
      show: (next) => setSlot(next),
      hide: (element) => setSlot((current) => (current?.element === element ? null : current)),
      showSpot: (next) => setSpot(next),
      hideSpot: (element) => setSpot((current) => (current?.element === element ? null : current)),
    }),
    []
  );

  const measure = useCallback(
    (moved: Moved) => {
      const root = container.current;
      if (!slot || !root) {
        return;
      }

      const { left, top } = offsetWithin(slot.element, root);
      const size = slot.element.offsetWidth;
      const room = root.clientWidth - (left + slot.bubbleAt.left * size) - BUBBLE_MARGIN;
      const at = slot.element;
      setBox((before) => ({ ...standAt(before, at, moved), x: left, y: top, size, room, width: root.clientWidth }));
    },
    [slot]
  );

  useLayoutEffect(() => {
    measure('screen');
    if (!slot) {
      return;
    }

    const follow = () => measure('layout');
    const observer = new ResizeObserver(follow);
    observer.observe(slot.element);
    if (container.current) {
      observer.observe(container.current);
    }
    window.addEventListener('resize', follow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', follow);
    };
  }, [slot, measure]);

  const glides = Boolean(box?.glides) && !reduced;

  return (
    <StageContext.Provider value={api}>
      <SpotContext.Provider value={spot}>
        <div ref={container} className={cn('relative', className)}>
          {children}
          {box && slot && (
            <motion.div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-0 z-10"
              initial={false}
              animate={{ x: box.x, y: box.y, width: box.size, height: box.size }}
              transition={glides ? GLIDE : { duration: 0 }}
            >
              {/*
               * The shadow travels with the mascot, under it, and changes shape between screens: on the screen it
               * rose in apart from the mascot gliding in, and seemed to come from somewhere else.
               */}
              <motion.span
                className="absolute rounded-[50%] bg-black/65"
                initial={false}
                animate={{
                  left: `${shadow.left * 100}%`,
                  top: `${shadow.top * 100}%`,
                  width: `${shadow.width * 100}%`,
                  height: `${SHADOW_HEIGHT * 100}%`,
                  opacity: slot.shadow ? 1 : 0,
                }}
                transition={{
                  default: glides ? GLIDE : { duration: 0 },
                  opacity: { duration: reduced ? 0 : 0.3, ease: 'easeOut' },
                }}
              />
              <MascotFace art="avatar" mood={slot.mood} look={look} ahead drawnOnly className="size-full" />
              <SpeechBubble
                text={slot.bubble}
                at={slot.bubbleAt}
                size={slot.bubbleSize}
                width={slot.bubbleWidth}
                room={box.room}
                stageWidth={box.width}
                mascotX={box.x}
                mascotSize={box.size}
                follows={!glides}
              />
            </motion.div>
          )}
        </div>
      </SpotContext.Provider>
    </StageContext.Provider>
  );
}

type MascotSlotProps = {
  /** What the mascot says on this screen. None leaves the bubble out. */
  bubble?: string;
  mood?: MascotMood;
  /** Where its bubble sits: over its top right quarter unless the screen says otherwise. */
  bubbleAt?: BubblePlace;
  bubbleSize?: BubbleSize;
  bubbleWidth?: number;
  /** Its shadow on the ground on this screen; none by default. */
  shadow?: MascotShadow;
  /** Its size and place on the screen: a square, as wide as the mascot is drawn there. */
  className?: string;
};

/** Marks where the mascot sits on a screen. It takes the mascot's room, and the mascot glides into it. */
export function MascotSlot({
  bubble,
  mood = 'awake',
  bubbleAt = UPPER_RIGHT,
  bubbleSize = 'medium',
  bubbleWidth,
  shadow,
  className,
}: MascotSlotProps) {
  const stage = useContext(StageContext);
  const ref = useRef<HTMLDivElement>(null);
  const { left, bottom } = bubbleAt;
  // A screen on its way out says nothing more: its bubble goes as soon as it starts to leave.
  const said = useIsPresent() ? bubble : undefined;
  const shadowLeft = shadow?.left;
  const shadowTop = shadow?.top;
  const shadowWidth = shadow?.width;

  useLayoutEffect(() => {
    const element = ref.current;
    if (!stage || !element) {
      return;
    }

    const ground =
      shadowLeft === undefined || shadowTop === undefined || shadowWidth === undefined
        ? undefined
        : { left: shadowLeft, top: shadowTop, width: shadowWidth };
    stage.show({ element, bubble: said, mood, bubbleAt: { left, bottom }, bubbleSize, bubbleWidth, shadow: ground });

    return () => stage.hide(element);
  }, [stage, said, mood, left, bottom, bubbleSize, bubbleWidth, shadowLeft, shadowTop, shadowWidth]);

  return <div ref={ref} aria-hidden="true" className={cn('aspect-square shrink-0', className)} />;
}

/** Where the design's `Depth / Spotlight` draws its dots inside its 1000×800 frame: a 723px square. */
const SPOT_ART = { left: 145.5, top: 49.5, size: 723 } as const;

type SpotlightSlotProps = {
  /** How strong the glow is on this screen: 0.18 to 0.24 in the design. */
  opacity: number;
  /**
   * Where the top left corner of the design's 1000×800 `Depth / Spotlight` frame is, within the slot's positioned
   * parent: `left-*` and `top-*` classes, which may change with the window's width. Never a transform: the layer
   * reads the slot's place from its offsets.
   */
  className: string;
};

/**
 * Marks where a screen has its glow. The glow is one layer under every screen (`SpotlightLayer`): it glides
 * from where one screen has it to where the next one does, as the mascot does, and fades to the next one's strength.
 */
export function SpotlightSlot({ opacity, className }: SpotlightSlotProps) {
  const stage = useContext(StageContext);
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!stage || !element) {
      return;
    }

    stage.showSpot({ element, opacity });

    return () => stage.hideSpot(element);
  }, [stage, opacity]);

  return <div ref={ref} aria-hidden="true" className={cn('pointer-events-none absolute size-0', className)} />;
}

/** The glow's dots, the design's `Depth / Spotlight`; drawn as a mask, so any colour can fill them. */
const SPOT_DOTS = 'url(/illustrations/depth-spotlight.svg)';

/**
 * The glow behind the screens, drawn once, under them and over the page's own pattern: put it first in the box the
 * screens are laid out in. Its dots are in the agent's colour, the design's ember orange (`#FF5C30`) being that
 * colour's second brightest tone, and blend into a new one as it is picked.
 */
export function SpotlightLayer({ color }: { color: LookColor }) {
  const spot = useContext(SpotContext);
  // A box with no size of its own at the top left of the layout, which the glow's place is measured from.
  const layer = useRef<HTMLSpanElement>(null);
  const [place, setPlace] = useState<(Stand & { x: number; y: number }) | null>(null);
  const reduced = useReducedMotion();

  const measure = useCallback(
    (moved: Moved) => {
      const root = layer.current?.offsetParent;
      if (!spot || !(root instanceof HTMLElement)) {
        return;
      }

      const { left, top } = offsetWithin(spot.element, root);
      const at = spot.element;
      setPlace((before) => ({ ...standAt(before, at, moved), x: left + SPOT_ART.left, y: top + SPOT_ART.top }));
    },
    [spot]
  );

  useLayoutEffect(() => {
    measure('screen');
    const root = layer.current?.offsetParent;
    if (!spot || !(root instanceof HTMLElement)) {
      return;
    }

    const follow = () => measure('layout');
    const observer = new ResizeObserver(follow);
    observer.observe(root);
    window.addEventListener('resize', follow);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', follow);
    };
  }, [spot, measure]);

  const glides = Boolean(place?.glides) && !reduced;

  const [red, green, blue] = LOOK_PALETTES[color].tones[4];
  const fill = `rgb(${red}, ${green}, ${blue})`;

  return (
    <span ref={layer} aria-hidden="true" className="pointer-events-none absolute top-0 left-0 select-none">
      {/*
       * Only drawn once its place is known: it fades in there, and from then on glides from one screen's place to
       * the next, and keeps to its place as the layout moves. Drawn before that, it started at the page's corner
       * and, on a reload, glided in from there.
       */}
      {place && (
        <motion.span
          className="absolute top-0 left-0 block"
          style={{
            width: SPOT_ART.size,
            height: SPOT_ART.size,
            maskImage: SPOT_DOTS,
            WebkitMaskImage: SPOT_DOTS,
            maskSize: '100% 100%',
            WebkitMaskSize: '100% 100%',
          }}
          initial={{ x: place.x, y: place.y, opacity: 0, backgroundColor: fill }}
          animate={{ x: place.x, y: place.y, opacity: spot ? spot.opacity : 0, backgroundColor: fill }}
          transition={{
            x: glides ? GLIDE : { duration: 0 },
            y: glides ? GLIDE : { duration: 0 },
            opacity: { duration: 0.4, ease: 'easeOut' },
            backgroundColor: { duration: reduced ? 0 : 0.5, ease: 'easeOut' },
          }}
        />
      )}
    </span>
  );
}

/**
 * The design's `Depth / Floor`: black dots in a long, flat band, the shadow under the card on A.1 and under the
 * window on A.4. Place it with `className`; it is 435×43, the dots of its 520×110 frame.
 */
export function DepthFloor({ className }: { className?: string }) {
  return (
    <img
      src="/illustrations/depth-floor.svg"
      alt=""
      aria-hidden="true"
      width={435}
      height={43}
      className={cn('pointer-events-none absolute max-w-none select-none', className)}
    />
  );
}

/** Each bubble's padding and words; its border is the design's 1px, inside. */
const BUBBLE_SIZES: Record<BubbleSize, { box: string; inset: number }> = {
  large: { box: 'px-4 py-3 text-base leading-5.5', inset: 34 },
  medium: { box: 'px-3.75 py-2.75 text-[15px] leading-5.25', inset: 32 },
};

type SpeechBubbleProps = {
  text?: string;
  at: BubblePlace;
  size: BubbleSize;
  width?: number;
  /** How wide the bubble may grow where the screen has it before it meets the window's edge. */
  room: number;
  /** How wide the stage is, and where the mascot is on it, for a bubble that has to move above the mascot. */
  stageWidth: number;
  mascotX: number;
  mascotSize: number;
  /** The mascot moved with the layout, not to another screen: the bubble keeps to it at once. */
  follows: boolean;
};

/**
 * The bubble on each screen comes out as the mascot says it: it waits for the mascot to have nearly glided in, then
 * fades in growing a little out of its tail. Leaving a screen, it goes quietly before the screen does.
 */
const SAYS = { delay: 0.35, duration: 0.4, ease: [0.22, 1, 0.36, 1] } as const;
const HUSHES = { duration: 0.15, ease: 'easeOut' } as const;
const HUSHED_SCALE = 0.88;

/**
 * What the mascot says (`Speech`): a bubble with its tail at the bottom left, pointing at the mascot. New words
 * fade in, the bubble grows or shrinks to them, and it moves to where the next screen has it. Where the window
 * leaves no room for it beside the mascot, it sits above the mascot instead, and its words wrap if they must.
 */
function SpeechBubble({ text, at, size, width, room, stageWidth, mascotX, mascotSize, follows }: SpeechBubbleProps) {
  const reduced = useReducedMotion();
  const [last, setLast] = useState(text);
  if (text && text !== last) {
    setLast(text);
  }

  const [measurer, setMeasurer] = useState<HTMLSpanElement | null>(null);
  const [natural, setNatural] = useState<number>();

  // The words' own width, rounded up: a whole-pixel width a fraction short of them would wrap them.
  useEffect(() => {
    if (!measurer) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setNatural(Math.ceil(entry.contentRect.width)));
    observer.observe(measurer);

    return () => observer.disconnect();
  }, [measurer]);

  const { box, inset } = BUBBLE_SIZES[size];
  const least = width === undefined ? 0 : width - inset;
  const wanted = natural === undefined ? undefined : Math.max(natural, least);
  const above = wanted !== undefined && wanted + inset > room;
  const most = (above ? stageWidth - 2 * BUBBLE_MARGIN : room) - inset;
  const wordsWidth = wanted === undefined ? undefined : Math.min(wanted, Math.max(most, 120));
  const words = text ?? last;

  // Above the mascot, it is centred over it, but kept inside the window's margins.
  const outer = (wordsWidth ?? 0) + inset;
  const centred = Math.min(
    Math.max(mascotSize / 2 - outer / 2, BUBBLE_MARGIN - mascotX),
    stageWidth - BUBBLE_MARGIN - outer - mascotX
  );
  const place = {
    left: above ? centred : at.left * mascotSize,
    bottom: above ? mascotSize + 8 : at.bottom * mascotSize,
  };
  const says = reduced ? { duration: 0.2 } : SAYS;

  return (
    <motion.div
      className={cn(
        'absolute w-max rounded-[18px_18px_18px_4px] border border-border-strong bg-raised text-foreground shadow-[0_10px_26px_-6px_rgb(0_0_0/0.45)] transition-[padding,font-size,line-height] duration-300 ease-out motion-reduce:transition-none',
        above ? 'origin-bottom' : 'origin-bottom-left',
        box
      )}
      initial={{ left: place.left, bottom: place.bottom, opacity: 0, scale: HUSHED_SCALE }}
      animate={{ ...place, opacity: text ? 1 : 0, scale: text ? 1 : HUSHED_SCALE }}
      transition={{
        default: follows ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' },
        opacity: text ? says : HUSHES,
        scale: text ? says : HUSHES,
      }}
    >
      {words && (
        <BubbleWords
          text={words}
          width={wordsWidth}
          oneLine={wanted !== undefined && wordsWidth === wanted}
          measure={setMeasurer}
        />
      )}
    </motion.div>
  );
}

type BubbleWordsProps = {
  text: string;
  /** The room the words get, once they have been measured: on one line, unless the window is too narrow. */
  width?: number;
  /** The words fit on one line: they stay on it while the room grows to them, instead of wrapping for a moment. */
  oneLine: boolean;
  /** Takes the hidden copy of the words that their width is measured on. */
  measure: (element: HTMLSpanElement | null) => void;
};

/** At most this many letters changed, the words are the same words being typed, not new ones. */
const TYPED_LETTERS = 3;

/**
 * The bubble's words; the room they take grows or shrinks to new words instead of jumping, as `MorphingText` does.
 * New words fade in, but a letter or two typed into the words there simply shows: fading in at every key, the words
 * blinked while the operator typed the agent's name.
 */
function BubbleWords({ text, width, oneLine, measure }: BubbleWordsProps) {
  const [shown, setShown] = useState({ text, words: 0 });
  if (text !== shown.text) {
    setShown({ text, words: isTyping(shown.text, text) ? shown.words : shown.words + 1 });
  }

  return (
    <span
      style={{ width }}
      className="relative block overflow-hidden transition-[width] duration-300 ease-out motion-reduce:transition-none"
    >
      <span ref={measure} aria-hidden="true" className="invisible absolute top-0 left-0 whitespace-nowrap">
        {text}
      </span>
      <span
        key={shown.words}
        style={{ width }}
        className={cn('block animate-overlay-in motion-reduce:animate-none', oneLine && 'whitespace-nowrap')}
      >
        {text}
      </span>
    </span>
  );
}

/** Whether `to` is `from` with a few letters typed or deleted in one place, as typing into a name makes it. */
function isTyping(from: string, to: string): boolean {
  let start = 0;
  while (start < from.length && start < to.length && from[start] === to[start]) {
    start += 1;
  }

  let end = 0;
  while (end < from.length - start && end < to.length - start && from.at(-1 - end) === to.at(-1 - end)) {
    end += 1;
  }

  return Math.max(from.length, to.length) - start - end <= TYPED_LETTERS;
}

/**
 * Where `element` is within `root`, from their layout alone: the offsets ignore the transforms a screen rises in
 * with, so the mascot heads for where its slot comes to rest, not where it is on the way.
 */
function offsetWithin(element: HTMLElement, root: HTMLElement): { left: number; top: number } {
  let left = 0;
  let top = 0;
  let current: HTMLElement | null = element;

  while (current && current !== root) {
    left += current.offsetLeft;
    top += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }

  return { left, top };
}
