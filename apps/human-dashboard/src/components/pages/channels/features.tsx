import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENT_BENEFITS, AGENTS, type AgentId, CHANNELS, type ChannelId, channelFeatures } from '@/data/channel-pages';
import { cn } from '@/lib/utils';
import { landingAudit } from './audit-attributes';

import { LandingHeading, LandingMark } from './shared';

export function ChannelFeatures({ channel, agent }: { channel: ChannelId; agent?: AgentId }) {
  const items = agent ? AGENT_BENEFITS : channelFeatures(channel);
  return (
    <SectionFrame anchor="features" auditId="features" className={cn('pt-20 md:pt-30', agent && 'mb-0.5')}>
      <div className="px-4 pb-14 md:px-8">
        <LandingHeading
          lead={agent ? 'Autonomous, but' : 'What your agent can do'}
          accent={agent ? 'never unsupervised' : CHANNELS[channel].location}
          description={
            agent
              ? `${AGENTS[agent].name} acts on its own and checks with you ${CHANNELS[channel].location} when it matters.`
              : `Agent Inbox runs the ${channel === 'telegram' ? 'bot' : 'connection'} for you. Your agent gets buttons, threads and files ${CHANNELS[channel].location} through the same CLI it uses for ${channel === 'telegram' ? 'email and Slack' : 'the other channels'}.`
          }
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
            <LandingMark name={item.icon} />
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
                {agent ? item.description.replace('Your agent', AGENTS[agent].name) : item.description}
              </p>
            </div>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}
