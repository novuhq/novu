'use client';

import { ArrowLeft, ArrowRight } from 'lucide-react';
import { type KeyboardEvent, type ReactNode, useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';

type CardCarouselProps = {
  /** The carousel's accessible name. */
  label: string;
  previousLabel: string;
  nextLabel: string;
  /** The word between a slide's number and the count in its accessible name: "2 of 5". */
  ofLabel: string;
  slides: readonly ReactNode[];
  className?: string;
};

/** Where each slide starts, from the first one: the scroll position that snaps it to the start. */
function slideOffsets(track: HTMLElement) {
  const items = [...track.children] as HTMLElement[];
  const first = items[0]?.offsetLeft ?? 0;

  return items.map((item) => item.offsetLeft - first);
}

/**
 * A row of cards that scrolls sideways and snaps to each card, with previous and next buttons and the arrow keys
 * on the focused track. Native scrolling does the moving, so touch, trackpads and reduced motion all just work.
 */
export function CardCarousel({ label, previousLabel, nextLabel, ofLabel, slides, className }: CardCarouselProps) {
  const track = useRef<HTMLUListElement>(null);
  const [state, setState] = useState({ active: 0, start: true, end: slides.length <= 1 });

  const update = useCallback(() => {
    const element = track.current;
    if (!element) return;
    const left = element.scrollLeft;
    const offsets = slideOffsets(element);
    const start = left <= 1;
    const end = left >= element.scrollWidth - element.clientWidth - 1;
    // The last slides can't reach the start of the track, so the end of the scroll counts as the last slide.
    const nearest = offsets.reduce(
      (best, offset, index) => (Math.abs(offset - left) < Math.abs(offsets[best] - left) ? index : best),
      0
    );
    const active = end && !start ? offsets.length - 1 : nearest;
    setState((current) =>
      current.active === active && current.start === start && current.end === end ? current : { active, start, end }
    );
  }, []);

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    update();
    element.addEventListener('scroll', update, { passive: true });
    const resize = new ResizeObserver(update);
    resize.observe(element);

    return () => {
      element.removeEventListener('scroll', update);
      resize.disconnect();
    };
  }, [update]);

  // Card starts past the end of the scroll are not places the track can rest, so stepping by the
  // active index sticks there: the previous card's start is still at or beyond the maximum.
  const scrollByStep = (direction: -1 | 1) => {
    const element = track.current;
    if (!element) return;
    const max = Math.max(0, element.scrollWidth - element.clientWidth);
    const left = element.scrollLeft;
    const stops = [0, ...slideOffsets(element).filter((offset) => offset > 1 && offset < max - 8), max];
    const target =
      direction < 0
        ? (stops.filter((stop) => stop < left - 1).at(-1) ?? 0)
        : (stops.find((stop) => stop > left + 1) ?? max);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    element.scrollTo({ left: target, behavior: reduce ? 'instant' : 'smooth' });
  };

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      scrollByStep(1);
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      scrollByStep(-1);
    }
  };

  return (
    <section aria-roledescription="carousel" aria-label={label} className={cn('flex flex-col gap-5', className)}>
      <ul
        ref={track}
        // biome-ignore lint/a11y/noNoninteractiveTabindex: the scrolling track takes the arrow keys
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="relative -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 [scrollbar-width:none] focus-visible:outline-offset-[-2px] md:-mx-8 md:scroll-px-8 md:gap-4 md:px-8 [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, index) => (
          // biome-ignore lint/a11y/useSemanticElements: the APG carousel pattern names each slide as a group
          <li
            key={index}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} ${ofLabel} ${slides.length}`}
            className="flex w-[85%] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2)] lg:w-[calc((100%-2rem)/2.4)]"
          >
            {slide}
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4">
        <div aria-hidden="true" className="flex items-center gap-4">
          <span className="font-sapien-mono text-[11px] leading-none tracking-tight text-sapien-foreground/40 tabular-nums">
            <span className="text-sapien-foreground">{String(state.active + 1).padStart(2, '0')}</span> /{' '}
            {String(slides.length).padStart(2, '0')}
          </span>
          <ol className="flex gap-1.5">
            {slides.map((_, index) => (
              <li
                key={index}
                className={cn(
                  'h-1 rounded-full transition-[width,background-color] duration-200 motion-reduce:transition-none',
                  index === state.active ? 'w-6 bg-accent' : 'w-1.5 bg-sapien-foreground/20'
                )}
              />
            ))}
          </ol>
        </div>
        <div className="flex gap-2">
          <CarouselButton label={previousLabel} disabled={state.start} onClick={() => scrollByStep(-1)}>
            <ArrowLeft className="size-4" strokeWidth={1.75} />
          </CarouselButton>
          <CarouselButton label={nextLabel} disabled={state.end} onClick={() => scrollByStep(1)}>
            <ArrowRight className="size-4" strokeWidth={1.75} />
          </CarouselButton>
        </div>
      </div>
    </section>
  );
}

function CarouselButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-sapien-border text-sapien-foreground transition-colors duration-150 hover:bg-sapien-foreground/5 disabled:cursor-default disabled:text-sapien-foreground/25 disabled:hover:bg-transparent motion-reduce:transition-none"
    >
      {children}
    </button>
  );
}
