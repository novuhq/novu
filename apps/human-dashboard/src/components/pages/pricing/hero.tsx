import Link from 'next/link';

import { DisplayAccent, SectionEyebrow } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';

export function PricingHero() {
  return (
    <SectionFrame anchor="overview" className="px-4 pt-18 pb-14 text-center md:px-8 md:pt-24 md:pb-18">
      <SectionEyebrow className="justify-center text-accent">Pricing</SectionEyebrow>
      <h1 className="mt-7 text-[34px] leading-[1.15] tracking-[-0.04em] md:text-[44px]">
        Built for agents.
        <DisplayAccent className="mt-2 block text-[46px] leading-none md:text-[64px]">
          Priced by conversation.
        </DisplayAccent>
      </h1>
      <p className="mx-auto mt-6 max-w-134.75 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/60">
        Start free. Give your agents more room as they grow.
        <br className="hidden sm:block" /> One conversation covers the whole exchange, not every message.
      </p>
      <Link
        href="#comparison"
        className="mt-6 inline-block font-sapien-mono text-xs text-accent underline decoration-accent/40 underline-offset-4 hover:decoration-accent"
      >
        Compare all features
      </Link>
    </SectionFrame>
  );
}
