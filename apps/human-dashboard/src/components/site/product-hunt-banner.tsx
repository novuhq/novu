import { ArrowUpRight } from 'lucide-react';

import { SectionDivider } from '@/components/sapien/section-divider';

/** Where "Support us" goes. Launch-day only: the strip on `/` and `/sapien`. */
export const PRODUCT_HUNT_URL = 'https://www.producthunt.com/products/agent-inbox?utm_source=other&utm_medium=social';

const MESSAGE = 'We are on Product Hunt today.';
const CTA = 'Support us';

/**
 * The launch notice. `paper` sits on the robots page (`/`), in that page's mono.
 * `ink` sits on the people page (`/sapien`), in its frame: a rail, the accent square, a mono line.
 */
export function ProductHuntBanner({ tone }: { tone: 'paper' | 'ink' }) {
  if (tone === 'paper') {
    return (
      <aside aria-label="Product Hunt" className="home-launch">
        <p>
          <span aria-hidden="true" className="home-launch-mark" />
          <span>{MESSAGE}</span>
          <a href={PRODUCT_HUNT_URL} target="_blank" rel="noreferrer">
            {CTA}
            <span aria-hidden="true"> →</span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </p>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Product Hunt"
      className="section-rails flex min-h-10 flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-2.5 py-2 font-sapien-mono text-[13px] leading-none tracking-tight sm:justify-between sm:px-2"
    >
      <p className="flex items-center gap-2 text-sapien-foreground/70">
        <span aria-hidden="true" className="size-1.5 shrink-0 bg-accent" />
        {MESSAGE}
      </p>
      <a
        href={PRODUCT_HUNT_URL}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-accent underline decoration-accent/40 underline-offset-[3px] transition-colors duration-150 hover:decoration-accent motion-reduce:transition-none"
      >
        {CTA}
        <ArrowUpRight aria-hidden="true" className="size-3.5" />
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
      <SectionDivider />
    </aside>
  );
}
