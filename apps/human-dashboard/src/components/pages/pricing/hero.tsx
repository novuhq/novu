import { DisplayAccent } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';

export function PricingHero() {
  return (
    <SectionFrame anchor="overview" className="px-4 pt-18 pb-14 md:px-8 md:pt-24 md:pb-18">
      <div className="grid items-end gap-6 lg:grid-cols-2 lg:gap-8">
        <h1 className="min-w-0 text-[30px] leading-[1.15] tracking-[-0.04em] md:text-4xl">
          Built for agents. Priced{' '}
          <DisplayAccent className="mt-2 block text-[44px] leading-none md:text-[56px]">by conversation</DisplayAccent>
        </h1>
        <p className="max-w-110 text-[15px] leading-[21px] tracking-tight text-pretty text-sapien-foreground/50">
          Start free. Give your agents more room as they grow. One conversation covers the whole exchange, not every
          message.
        </p>
      </div>
    </SectionFrame>
  );
}
