import { Check, Minus } from 'lucide-react';

import { LandingHeading } from '@/components/pages/channels/shared';
import { SectionFrame } from '@/components/sapien/section-frame';
import { PRICING_FEATURES, PRICING_PLANS } from '@/data/pricing';
import { cn } from '@/lib/utils';

export function PricingComparison() {
  return (
    <SectionFrame anchor="comparison" className="px-4 py-20 md:px-8 md:py-24">
      <LandingHeading
        lead="Everything you need."
        accent="Room to grow."
        description="The same tools on every plan. Choose the capacity that fits your agents."
      />
      <p className="mt-8 font-sapien-mono text-[11px] leading-[18px] text-sapien-foreground/50 md:hidden">
        Swipe to compare plans →
        <span className="sr-only"> Or focus the table and use the left and right arrow keys.</span>
      </p>
      <section
        aria-label="Compare plans"
        aria-description="Swipe to compare plans, or use the left and right arrow keys when focused."
        // biome-ignore lint/a11y/noNoninteractiveTabindex: native horizontal scrolling must be keyboard accessible
        tabIndex={0}
        className="isolate mt-4 overflow-x-auto overscroll-x-contain rounded-xl border border-sapien-border focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent md:mt-12"
      >
        <table className="w-full min-w-134 table-fixed border-collapse text-[15px] leading-[21px] md:min-w-0">
          <caption className="sr-only">Agent Inbox plan comparison</caption>
          <colgroup>
            <col className="w-32 md:w-2/5" />
            {PRICING_PLANS.map((plan) => (
              <col key={plan.id} className="w-34 md:w-1/5" />
            ))}
          </colgroup>
          <thead>
            <tr className="bg-sapien-border">
              <th
                scope="col"
                className="sticky left-0 z-10 bg-sapien-border px-4 py-5 text-left font-sapien-mono text-xs font-normal text-sapien-foreground/50 md:px-5"
              >
                What’s included
              </th>
              {PRICING_PLANS.map((plan) => (
                <th
                  key={plan.id}
                  id={`pricing-column-${plan.id}`}
                  scope="col"
                  className={cn('px-4 py-5 text-left font-medium md:px-5', plan.id === 'pro' && 'text-accent')}
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PRICING_FEATURES.map((feature) => (
              <tr key={feature.key} className="border-b border-sapien-border last:border-b-0">
                <th
                  id={`pricing-feature-${feature.key}`}
                  scope="row"
                  className="sticky left-0 z-10 bg-sapien-background px-4 py-5 text-left font-normal tracking-tight text-sapien-foreground/70 md:px-5"
                >
                  {feature.label}
                </th>
                {PRICING_PLANS.map((plan) => (
                  <td
                    key={plan.id}
                    headers={`pricing-feature-${feature.key} pricing-column-${plan.id}`}
                    className={cn('px-4 py-5 text-left md:px-5', plan.id === 'pro' && 'bg-sapien-border/50')}
                  >
                    <FeatureValue value={plan.limits[feature.key]} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </SectionFrame>
  );
}

function FeatureValue({ value }: { value: string | boolean }) {
  if (typeof value === 'string') return <>{value}</>;
  return (
    <span className="inline-flex align-middle">
      {value ? (
        <Check aria-hidden="true" className="size-4 text-accent" />
      ) : (
        <Minus aria-hidden="true" className="size-4 text-sapien-foreground/30" />
      )}
      <span className="sr-only">{value ? 'Included' : 'Not included'}</span>
    </span>
  );
}
