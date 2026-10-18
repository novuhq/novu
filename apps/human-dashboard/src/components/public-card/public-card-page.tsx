import { ArrowRight } from 'lucide-react';

import { Brand } from '@/components/site/brand';
import { AGENT_DOMAIN, writtenLink } from '@/lib/onboarding';
import type { PublicAgentCard } from '@/lib/public-agent-card';
import { cn } from '@/lib/utils';

import { PublicCard } from './public-card';
import { Reach } from './reach';

/** How the top bar, the footer and the background come in once the page has loaded. */
const FADE_IN = 'animate-overlay-in [animation-duration:300ms] motion-reduce:animate-none';

/**
 * The page of an agent's public card (`4 · Public card · visitor view`): the logo and "Get your agent a card"
 * over the top of the page, the card beside "Reach atlas anywhere.", both over dotted rings and an orange halo
 * centred on the card, and the card's link at the bottom. Narrower than the two side by side, which the design
 * doesn't draw, "Reach atlas anywhere." goes under the card.
 */
export function PublicCardPage({ card }: { card: PublicAgentCard }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col overflow-hidden">
      <header
        className={cn(
          'absolute inset-x-4 top-8 flex items-center justify-between gap-4 min-[880px]:inset-x-10',
          FADE_IN
        )}
      >
        <Brand />
        <a
          href={`https://${AGENT_DOMAIN}`}
          className="group flex items-center gap-1.5 rounded-sm text-[13px] leading-4.5 whitespace-nowrap text-default transition-colors duration-150 hover:text-foreground motion-reduce:transition-none"
        >
          Get your agent a card
          {/* Drawn, not typed: the Geist the app loads has no arrow, and another font's `→` is longer. */}
          <ArrowRight
            aria-hidden="true"
            className="size-3.25 text-accent transition-transform duration-150 motion-safe:group-hover:translate-x-0.5 motion-reduce:transition-none"
          />
        </a>
      </header>

      {/* Side by side, the content is centred between the top bar (54px) and the footer (44px), as the design places it. */}
      <main className="flex flex-1 items-center justify-center px-4 pt-24 pb-10 min-[880px]:pt-23.5 min-[880px]:pb-21">
        <div className="flex w-full flex-col items-center gap-10 min-[880px]:w-auto min-[880px]:flex-row min-[880px]:gap-24">
          <div className="relative w-85 max-w-full shrink-0">
            <Backdrop />
            <PublicCard card={card} />
          </div>
          <Reach card={card} />
        </div>
      </main>

      {/* Under the content when the two are stacked, and at the bottom of the page when they are side by side. */}
      <footer
        className={cn(
          'mx-auto flex max-w-full items-center gap-2 px-4 pb-6.5 whitespace-nowrap text-muted min-[880px]:absolute min-[880px]:bottom-6.5 min-[880px]:left-1/2 min-[880px]:-translate-x-1/2 min-[880px]:pb-0',
          FADE_IN
        )}
      >
        <span className="min-w-0 truncate font-mono text-[11px] leading-3.5">{writtenLink(card.cardLink)}</span>
        <span aria-hidden="true" className="text-[13px] leading-4.5">
          ·
        </span>
        <span className="text-[11px] leading-3.5">A product of Novu</span>
      </footer>
    </div>
  );
}

/**
 * The page's background (`Background` in the design, at 60%): dotted rings and a soft orange halo, exported as
 * they are and drawn at their own size, so their dots stay sharp. They are placed from the card's corner as the
 * design places them, so they stay centred on the card at any window size; the page cuts off what falls outside.
 */
function Backdrop() {
  return (
    <div
      aria-hidden="true"
      className={cn('pointer-events-none absolute inset-0 -z-10 opacity-60 select-none', FADE_IN)}
    >
      <img
        src="/illustrations/texture-rings.svg"
        alt=""
        width={1539}
        height={1050}
        className="absolute -top-77.25 -left-113.5 h-262.5 w-384.75 max-w-none"
      />
      <img
        src="/illustrations/texture-halo.svg"
        alt=""
        width={580}
        height={772}
        className="absolute -top-40.25 -left-28.5 h-193 w-145 max-w-none opacity-16"
      />
    </div>
  );
}
