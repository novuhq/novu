import { SectionFrame } from '@/components/sapien/section-frame';
import { type ChannelId, channelHub } from '@/data/channel-pages';
import { landingAudit } from './audit-attributes';

import { LandingHeading } from './shared';

export function ChannelUseCases({ channel }: { channel: ChannelId }) {
  return (
    <SectionFrame anchor="use-cases" auditId="use-cases" className="pt-20 md:pt-30">
      <div className="px-4 pb-14 md:px-8">
        <LandingHeading lead="What people" accent="build with it" />
      </div>
      <div className="grid md:grid-cols-2">
        {channelHub(channel).useCases.map((item, index) => (
          <article
            key={item.label}
            className="flex min-h-53.25 min-w-0 flex-col items-start border-t border-r border-sapien-border p-7 md:even:border-r-0 md:[&:nth-child(n+3)]:-mt-px md:[&:nth-child(n+3)]:min-h-56.25"
          >
            <p className="flex items-center gap-2 font-sapien-mono text-[11px] leading-none tracking-tight text-accent">
              <span aria-hidden="true" className="size-1 rounded-[1px] bg-accent" />
              {item.label}
            </p>
            <h3
              {...landingAudit(`use-case-${index}-title`, 'use-cases', 'text', 'heading')}
              className="mt-5 w-full text-lg leading-[23px] tracking-tight"
            >
              {item.title}
            </h3>
            <p
              {...landingAudit(`use-case-${index}-description`, 'use-cases')}
              className="mt-2.5 min-h-10.5 w-full text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50"
            >
              {item.description}
            </p>
            <code className="mt-5 flex max-w-full gap-2 overflow-x-auto rounded bg-sapien-border px-2.5 py-2 font-sapien-mono text-[13px] leading-[13px] whitespace-pre text-sapien-foreground/50">
              <span className="text-accent">$</span>
              <span>{item.command}</span>
            </code>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}
