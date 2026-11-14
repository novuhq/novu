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
      <table className="mt-12 hidden w-full table-fixed border-collapse text-[15px] leading-[21px] md:table">
        <caption className="sr-only">Agent Inbox plan comparison</caption>
        <colgroup>
          <col className="w-2/5" />
          {PRICING_PLANS.map((plan) => (
            <col key={plan.id} className="w-1/5" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-sapien-surface">
            <th
              scope="col"
              className="py-5 pr-4 text-left font-sapien-mono text-xs font-normal text-sapien-foreground/50"
            >
              What’s included
            </th>
            {PRICING_PLANS.map((plan) => (
              <th
                key={plan.id}
                id={`pricing-column-${plan.id}`}
                scope="col"
                className={cn('px-3 py-5 text-center font-medium', plan.id === 'pro' && 'text-accent')}
              >
                {plan.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PRICING_FEATURES.map((feature) => (
            <tr key={feature.key} className="border-b border-sapien-border">
              <th
                id={`pricing-feature-${feature.key}`}
                scope="row"
                className="py-5 pr-4 text-left font-normal tracking-tight text-sapien-foreground/70"
              >
                {feature.label}
              </th>
              {PRICING_PLANS.map((plan) => (
                <td
                  key={plan.id}
                  headers={`pricing-feature-${feature.key} pricing-column-${plan.id}`}
                  className={cn('px-3 py-5 text-center', plan.id === 'pro' && 'bg-sapien-border/20')}
                >
                  <FeatureValue value={plan.limits[feature.key]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-10 divide-y divide-sapien-border border-y border-sapien-border md:hidden">
        {PRICING_FEATURES.map((feature) => (
          <div key={feature.key} className="py-5">
            <h3 className="text-sm tracking-tight text-sapien-foreground/80">{feature.label}</h3>
            <dl className="mt-4 grid grid-cols-3 gap-2">
              {PRICING_PLANS.map((plan) => (
                <div key={plan.id} className="min-w-0">
                  <dt
                    className={cn(
                      'font-sapien-mono text-[11px] text-sapien-foreground/50',
                      plan.id === 'pro' && 'text-accent'
                    )}
                  >
                    {plan.name}
                  </dt>
                  <dd className="mt-2 text-[13px] leading-[18px]">
                    <FeatureValue value={plan.limits[feature.key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
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
