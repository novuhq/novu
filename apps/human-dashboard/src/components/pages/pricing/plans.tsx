import Link from 'next/link';

import { SectionFrame } from '@/components/sapien/section-frame';
import { PRICING_PLANS, type PricingPlan } from '@/data/pricing';
import { cn } from '@/lib/utils';

export function PricingPlans() {
  return (
    <SectionFrame anchor="plans" className="px-4 py-10 md:px-8 md:py-14">
      <h2 className="sr-only">Choose your plan</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {PRICING_PLANS.map((plan, index) => (
          <PlanCard key={plan.id} plan={plan} index={index} />
        ))}
      </div>
      <p className="mt-7 text-center font-sapien-mono text-[11px] leading-[18px] text-sapien-foreground/50">
        Every plan includes contacts, invitations, CLI, MCP, SDK, API, human-in-the-loop and webhooks.
      </p>
    </SectionFrame>
  );
}

function PlanCard({ plan, index }: { plan: PricingPlan; index: number }) {
  const pro = plan.id === 'pro';
  return (
    <article
      aria-labelledby={`plan-${plan.id}`}
      className={cn(
        'relative flex min-w-0 flex-col overflow-hidden rounded-[14px] border border-sapien-border p-5 lg:p-6',
        pro && 'border-accent/70 bg-sapien-border/30'
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={`plan-${plan.id}`} className="text-xl tracking-tight">
          {plan.name}
        </h3>
        <span aria-hidden="true" className="font-sapien-mono text-[11px] text-sapien-foreground/30">
          0{index + 1}
        </span>
      </div>
      <p className="mt-2 min-h-10.5 text-sm leading-[21px] tracking-tight text-sapien-foreground/50">
        {plan.description}
      </p>
      <p className="mt-7 flex min-h-13 items-baseline gap-2">
        <span className={cn('text-[44px] leading-none tracking-[-0.05em]', pro && 'text-accent')}>{plan.price}</span>
        {plan.period && <span className="text-sm text-sapien-foreground/50">{plan.period}</span>}
      </p>
      <Link
        href={plan.href}
        aria-label={`${plan.action}: ${plan.name}`}
        className={cn(
          'mt-6 flex min-h-11 items-center justify-center rounded-lg bg-sapien-border px-4 py-3 text-sm font-medium tracking-tight transition-colors hover:bg-sapien-surface motion-reduce:transition-none',
          pro && 'bg-sapien-foreground text-black hover:bg-white'
        )}
      >
        {plan.action}
      </Link>
      <div className="mt-7 border-t border-sapien-border pt-6">
        <p className="font-sapien-mono text-[28px] leading-none tracking-tight md:min-h-14 lg:min-h-7">
          {plan.limits.conversations}
        </p>
        <p className="mt-2 text-sm leading-5 text-sapien-foreground/60">active conversations / month</p>
      </div>
      <dl className="mt-6 mb-6 space-y-3 text-[13px] leading-[18px]">
        {[
          ['Agent inboxes', plan.limits.inboxes],
          ['Connected channels', plan.limits.channels],
          ['Custom email domains', plan.limits.domains || 'None'],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between gap-3 md:min-h-9 lg:min-h-4.5">
            <dt className="text-sapien-foreground/50">{label}</dt>
            <dd className="text-right">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-auto border-t border-sapien-border pt-4 font-sapien-mono text-[11px] leading-[18px] text-sapien-foreground/50">
        Extra conversations: <span className="text-sapien-foreground/80">{plan.limits.extra}</span>
      </p>
    </article>
  );
}
