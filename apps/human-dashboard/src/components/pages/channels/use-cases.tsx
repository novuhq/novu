import { CopyCommand } from '@/components/sapien/copy-command';
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
            className="flex min-h-53.25 min-w-0 flex-col items-start justify-between gap-6 border-t border-sapien-border p-7 md:border-r md:even:border-r-0 md:[&:nth-child(n+3)]:min-h-56.25"
          >
            <p className="flex items-center gap-2 font-sapien-mono text-[11px] leading-none tracking-tight text-accent">
              <span aria-hidden="true" className="size-1 rounded-[1px] bg-accent" />
              {item.label}
            </p>
            <div className="w-full min-w-0">
              <p
                {...landingAudit(`use-case-${index}-description`, 'use-cases')}
                className="text-base leading-[22px] tracking-tight text-sapien-foreground/50"
              >
                <strong
                  {...landingAudit(`use-case-${index}-title`, 'use-cases', 'text', 'label')}
                  className="font-normal text-sapien-foreground"
                >
                  {item.title}.
                </strong>{' '}
                {item.description}
              </p>
              <CopyCommand
                command={item.command}
                label={`${item.label} command`}
                variant="icon"
                appearance="surface"
                className="mt-4 w-full"
              />
            </div>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}
