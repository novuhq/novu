import Image from 'next/image';
import { DisplayAccent } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENTS, type AgentId, CHANNELS, type ChannelId } from '@/data/channel-pages';
import { cn } from '@/lib/utils';
import { landingAudit } from './audit-attributes';

import { Breadcrumbs, LandingActions, LandingMark } from './shared';

export function ChannelHero({ channel, agent }: { channel: ChannelId; agent?: AgentId }) {
  const details = CHANNELS[channel];
  const name = agent ? AGENTS[agent].name : undefined;
  return (
    <SectionFrame
      anchor="overview"
      auditId="overview"
      className={cn('px-4 pt-14 pb-2 md:px-8 md:pt-18', agent && 'pt-7 md:pt-7')}
    >
      {agent && <Breadcrumbs channel={channel} agent={agent} />}
      <div
        className={cn(
          'mx-auto flex max-w-full flex-col items-center gap-6 text-center',
          agent && 'gap-7 py-14 md:py-18'
        )}
      >
        {!agent && (
          <p className="flex items-center gap-2 font-sapien-mono text-[11px] leading-none tracking-tight text-accent">
            <span aria-hidden="true" className="size-1 rounded-[1px] bg-accent" />
            Agent Inbox for {details.name}
          </p>
        )}
        <h1
          className="flex flex-col items-center gap-1.5 text-[28px] leading-[1.125] tracking-[-0.04em] md:text-[32px]"
          data-prime-audit-id="hero-title"
          data-prime-audit-section="overview"
          data-prime-audit-kind="element"
          data-prime-audit-role="heading"
        >
          <span {...landingAudit('hero-lead', 'overview', 'text', 'heading')} className="text-sapien-foreground/70">
            {name ? `Connect ${name}` : 'Give your AI agent'}
          </span>
          <DisplayAccent className="block text-[42px] leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] md:h-[39px] md:text-[56px]">
            {name ? `to ${details.name}` : `its own ${details.noun}`}
          </DisplayAccent>
        </h1>
        <p
          {...landingAudit('hero-description', 'overview')}
          className={cn(
            'max-w-97 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50',
            agent && 'max-w-140'
          )}
        >
          {name
            ? `${name} runs your errands. With Agent Inbox, it checks with you ${details.location} and gets your answer in one tap.`
            : details.description}
        </p>
        <div className="w-full max-w-134.75">
          <LandingActions channel={channel} agent={agent} />
        </div>
      </div>
      <div
        className={cn('relative mx-auto gap-0 h-125 w-full overflow-hidden md:h-150', agent && 'h-125 md:h-140')}
        data-prime-audit-id="hero-media"
        data-prime-audit-kind="media"
        data-prime-audit-section="overview"
        data-prime-audit-role="illustration"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute top-30 left-1/2 h-[794px] w-[785px] -translate-x-1/2 rounded-full bg-accent opacity-10 blur-[66px]"
        />
        {agent && (
          <div
            aria-hidden="true"
            className="absolute top-1 left-1/2 flex h-20 w-65 -translate-x-1/2 items-center justify-between"
          >
            <div className="flex size-20 items-center justify-center rounded-[17px] border-[0.833px] border-[#383633] bg-sapien-border">
              <LandingMark name={agent} size={47} />
            </div>
            <span className="relative h-px w-25 bg-sapien-surface">
              <span className="absolute top-1/2 left-1/2 size-1.5 -translate-1/2 rounded-[1px] bg-accent" />
            </span>
            <div className="flex size-20 items-center justify-center rounded-[17px] border-[0.833px] border-[#383633] bg-sapien-border">
              <LandingMark name={channel} size={47} />
            </div>
          </div>
        )}
        <div
          className={cn(
            'absolute top-17 left-1/2 w-[min(454px,100%)] -translate-x-1/2 overflow-hidden rounded-2xl border border-sapien-surface bg-black shadow-[0_24px_64px_rgba(0,0,0,0.6)]',
            agent && 'top-28 w-[min(440px,100%)]'
          )}
        >
          <Image
            src={`/images/landing/hero-${agent ? 'openclaw' : 'telegram'}.jpg`}
            width={agent ? 876 : 906}
            height={agent ? 808 : 924}
            alt={
              agent
                ? 'An agent offers flight options, receives a choice, and confirms the booking.'
                : 'An agent requests refund approval, receives an answer, and sends a receipt.'
            }
            className="block h-auto w-full"
            preload
            unoptimized
          />
        </div>
      </div>
      <div
        className="relative flex min-h-12.5 flex-wrap items-center justify-between gap-2 rounded-md bg-black px-4.5 py-3 font-sapien-mono text-[11px] leading-none tracking-tight md:gap-0 md:py-0 md:text-[13px]"
        data-prime-audit-id="hero-caption"
        data-prime-audit-section="overview"
        data-prime-audit-kind="element"
        data-prime-audit-role="caption"
      >
        <span className="text-sapien-foreground/50">
          fig. 01 — {agent ? `${agent} on ` : ''}
          {channel}
        </span>
        <span>
          [ {agent ?? 'agent'} → <span className="text-accent">asks</span> → {agent ? 'you' : 'human'} ]
        </span>
      </div>
    </SectionFrame>
  );
}
