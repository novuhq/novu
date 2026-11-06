import { FaqRow } from '@/components/sapien/faq';
import { SectionFrame } from '@/components/sapien/section-frame';
import { type AgentId, agentFaq, type ChannelId, channelFaq } from '@/data/channel-pages';
import { cn } from '@/lib/utils';
import { landingAudit } from './audit-attributes';

export function ChannelFaq({ channel, agent }: { channel: ChannelId; agent?: AgentId }) {
  const items = agent ? agentFaq(channel, agent) : channelFaq(channel);
  return (
    <SectionFrame
      anchor="faq"
      auditId="faq"
      className={cn(
        'grid gap-8 px-4 py-20 lg:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,637px)] md:px-8 md:py-37',
        agent && 'md:py-30'
      )}
    >
      <h2
        {...landingAudit('faq-heading', 'faq', 'text', 'heading')}
        className="w-fit self-start text-[34px] leading-[1.125] tracking-[-0.04em] md:text-[40px]"
      >
        Questions,{'\n'}
        <br />
        answers
      </h2>
      <div className="overflow-hidden rounded-xl border border-sapien-border">
        {items.map((item) => (
          <FaqRow key={item.id} item={item} variant="landing" />
        ))}
      </div>
    </SectionFrame>
  );
}
