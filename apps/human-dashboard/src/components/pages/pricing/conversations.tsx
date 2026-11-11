import { LandingHeading } from '@/components/pages/channels/shared';
import { SectionFrame } from '@/components/sapien/section-frame';
import { CONVERSATION_EXAMPLES, CONVERSATION_RULES } from '@/data/pricing';

export function PricingConversations() {
  return (
    <SectionFrame anchor="conversations" className="px-4 py-20 md:px-8 md:py-24">
      <LandingHeading
        lead="What counts as"
        accent="a conversation?"
        className="max-[359px]:[&_em]:text-[40px]"
        description="One thread. One channel. One fixed 24-hour window. The full exchange counts once."
      />
      <ol className="mt-12 grid gap-8 md:grid-cols-3 md:gap-6">
        {CONVERSATION_RULES.map((rule, index) => (
          <li key={rule.title} className="border-t border-sapien-border pt-5">
            <span aria-hidden="true" className="font-sapien-mono text-xs text-accent">
              0{index + 1}
            </span>
            <h3 className="mt-4 text-lg leading-6 tracking-tight md:min-h-12">{rule.title}</h3>
            <p className="mt-3 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
              {rule.description}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-12 overflow-hidden rounded-[14px] border border-sapien-border">
        <h3 className="border-b border-sapien-border px-5 py-4 font-sapien-mono text-xs text-sapien-foreground/50 md:px-6">
          In practice
        </h3>
        <dl className="divide-y divide-sapien-border">
          {CONVERSATION_EXAMPLES.map((item) => (
            <div key={item.example} className="flex items-center justify-between gap-5 px-5 py-5 md:px-6">
              <dt className="max-w-130 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/70">
                {item.example}
              </dt>
              <dd className="w-24 shrink-0 text-right">
                <span className="font-sapien-mono text-2xl leading-none text-accent">{item.count}</span>
                <span className="mt-1 block font-sapien-mono text-[10px] leading-4 text-sapien-foreground/50">
                  {item.unit}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </SectionFrame>
  );
}
