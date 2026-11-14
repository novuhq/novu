import { SectionFrame } from '@/components/sapien/section-frame';
import { type AgentId, agentPage, CHANNELS, type ChannelId, channelHub, plain } from '@/data/channel-pages';
import { cn } from '@/lib/utils';
import { landingAudit } from './audit-attributes';

import { LandingHeading, LandingMark } from './shared';

export function ChannelFeatures({ channel, agent }: { channel: ChannelId; agent?: AgentId }) {
  const page = agent ? agentPage(channel, agent) : undefined;
  const items = page ? page.benefits : channelHub(channel).features;
  return (
    <SectionFrame anchor="features" auditId="features" className={cn('pt-20 md:pt-30', agent && 'mb-0.5')}>
      <div className="px-4 pb-14 md:px-8">
        <LandingHeading
          lead={page ? page.benefitsHeading[0] : 'What your agent can do'}
          accent={page ? page.benefitsHeading[1] : CHANNELS[channel].location}
          description={page ? plain(page.benefitsIntro) : undefined}
        />
      </div>
      <div className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4', agent && 'md:grid-cols-3')}>
        {items.map((item, index) => (
          <article
            key={item.title}
            className={cn(
              'border-t border-r border-sapien-border p-6 md:min-h-55.5 last:border-r-0',
              agent && 'md:min-h-51'
            )}
          >
            <LandingMark name={agent ? `agent-benefit-${index}` : `channel-feature-${index}`} />
            <div className={cn('mt-8', agent && 'mt-14')}>
              <h3
                {...landingAudit(`feature-${index}-title`, 'features', 'text', 'heading')}
                className="text-lg leading-[23px] tracking-tight"
              >
                {item.title}
              </h3>
              <p
                {...landingAudit(`feature-${index}-description`, 'features')}
                className="mt-2.5 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50"
              >
                {plain(item.description)}
              </p>
            </div>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}
