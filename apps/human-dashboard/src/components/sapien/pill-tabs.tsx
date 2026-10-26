'use client';

import { type ComponentProps, type ReactNode, useEffect, useRef, useState } from 'react';
import { TabsList, TabsTrigger } from '@/components/sapien/tabs';
import { cn } from '@/lib/utils';

/** Width of the fade on an edge that has more tabs scrolled past it. */
const FADE = '40px';

/**
 * A row of equal-width pill tabs that scrolls sideways rather than wrapping a
 * label (below sm, or wherever enlarged text spacing needs it), with the edges
 * that have more tabs past them faded out; when every label fits, the tabs
 * share the width. Below sm the row is a full-width strip. The active tab is
 * kept in view.
 */
export function PillTabsList({ className, children, ...props }: ComponentProps<typeof TabsList>) {
  const viewport = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: false, end: false });

  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => {
      const max = element.scrollWidth - element.clientWidth;
      const start = element.scrollLeft > 1;
      const end = element.scrollLeft < max - 1;
      setEdges((current) => (current.start === start && current.end === end ? current : { start, end }));
    };
    // Centre the active tab when it changes (and once at the start), unless the row fits.
    const reveal = (behavior: ScrollBehavior) => {
      const tab = element.querySelector<HTMLElement>('[data-state="active"]');
      if (!tab || element.scrollWidth <= element.clientWidth) return;
      const left = tab.offsetLeft + tab.offsetWidth / 2 - element.clientWidth / 2;
      const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
      element.scrollTo({ left, behavior: reduce ? 'instant' : behavior });
    };
    reveal('instant');
    update();
    element.addEventListener('scroll', update, { passive: true });
    // The row's own size changes too when the font loads or text is enlarged.
    const resize = new ResizeObserver(update);
    resize.observe(element);
    if (element.firstElementChild) resize.observe(element.firstElementChild);
    const active = new MutationObserver(() => reveal('smooth'));
    active.observe(element, {
      subtree: true,
      attributes: true,
      attributeFilter: ['data-state'],
    });
    return () => {
      element.removeEventListener('scroll', update);
      resize.disconnect();
      active.disconnect();
    };
  }, []);

  const mask = `linear-gradient(to right, ${edges.start ? 'transparent' : '#000'}, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.end ? 'transparent' : '#000'})`;
  return (
    // The border sits outside the faded area, so the strip's lines run to the rails.
    <div className={cn('border-y border-sapien-border sm:rounded-xl sm:border', className)}>
      <div
        ref={viewport}
        className="relative [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={edges.start || edges.end ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      >
        {/* max-content wide with equal 1fr columns, so every tab is as wide as
            the longest label; at least the strip's width, so short rows fill it
            (on mobile tabs start at the rails, as in Figma). Below 360px the
            tabs' side padding shrinks so four short labels still fit at 320px. */}
        <TabsList className="grid w-max min-w-full auto-cols-fr grid-flow-col py-1 sm:px-1" {...props}>
          {children}
        </TabsList>
      </div>
    </div>
  );
}

export function PillTab({
  className,
  children,
  ...props
}: ComponentProps<typeof TabsTrigger> & { children: ReactNode }) {
  return (
    <TabsTrigger
      className={cn(
        'flex h-9 items-center justify-center rounded-lg px-2 text-sm leading-none font-medium tracking-tight whitespace-nowrap text-sapien-foreground focus-visible:outline-offset-[-3px] focus-visible:outline-sapien-foreground data-[state=active]:bg-accent data-[state=active]:text-black data-[state=inactive]:hover:bg-sapien-foreground/5 min-[360px]:px-3.5 sm:h-10 sm:px-6 sm:text-[15px]',
        className
      )}
      {...props}
    >
      {/* Trimmed to cap height and baseline, so the capitals sit in the middle
          of the pill whatever the font's line metrics. The focus ring is inset:
          the scrolling row would clip one drawn outside the tab. */}
      <span className="[text-box-edge:cap_alphabetic] [text-box-trim:trim-both]">{children}</span>
    </TabsTrigger>
  );
}
