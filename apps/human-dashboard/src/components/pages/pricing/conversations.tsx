import { LandingHeading } from '@/components/pages/channels/shared';
import { SectionFrame } from '@/components/sapien/section-frame';
import { CONVERSATION_EXAMPLES, CONVERSATION_RULES } from '@/data/pricing';

export function PricingConversations() {
  return (
    <SectionFrame anchor="conversations" className="py-20 md:py-24">
      <div className="px-4 md:px-8">
        <LandingHeading
          lead="What counts as"
          accent="a conversation?"
          className="max-[359px]:[&_em]:text-[40px]"
          description="One thread. One channel. One fixed 24-hour window. The full exchange counts once."
        />
      </div>
      <ol className="mt-12 grid border-y border-sapien-border md:grid-cols-3">
        {CONVERSATION_RULES.map((rule, index) => (
          <li
            key={rule.title}
            className="border-b border-sapien-border p-6 last:border-b-0 md:border-r md:border-b-0 md:p-8 md:last:border-r-0"
          >
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded bg-sapien-foreground/8 font-sapien-mono text-xs text-accent"
            >
              {index + 1}
            </span>
            <p className="mt-6 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
              <strong className="font-normal text-sapien-foreground">{rule.title}.</strong> {rule.description}
            </p>
          </li>
        ))}
      </ol>
      <div className="mx-4 mt-12 overflow-hidden rounded-[14px] border border-sapien-border md:mx-8">
        <div className="flex items-center justify-between gap-5 bg-sapien-border px-5 py-4 font-sapien-mono text-xs text-sapien-foreground/50 md:px-6">
          <h3>In practice</h3>
          <span>Conversations</span>
        </div>
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
