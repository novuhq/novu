import Image from 'next/image';
import Link from 'next/link';

import { DisplayAccent } from '@/components/sapien/section-eyebrow';
import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENTS, type AgentId, CHANNELS, type ChannelId, otherAgentChannels } from '@/data/channel-pages';

import { cn } from '@/lib/utils';

import { AgentCards } from './agent-grid';
import { LandingActions } from './shared';

export function ChannelClosing({ channel, agent }: { channel: ChannelId; agent?: AgentId }) {
  const related = agent ? otherAgentChannels(channel, agent) : [];
  return (
    <SectionFrame
      anchor="get-started"
      auditId="get-started"
      className={cn('flex flex-col gap-22 px-4 py-20 md:px-8 md:py-30', !agent && 'mb-0')}
    >
      <div className="grid items-center gap-12 md:grid-cols-2 lg:grid-cols-[420px_360px] lg:justify-between lg:gap-x-0">
        <div>
          <h2 className="flex flex-col gap-2 text-[34px] leading-[1.125] tracking-[-0.04em] md:text-[40px]">
            <span>Give your agent</span>
            <span className="flex flex-wrap items-baseline gap-x-3 md:h-[47px] lg:flex-nowrap">
              <span className="whitespace-nowrap">a {CHANNELS[channel].noun}.</span>
              <DisplayAccent className="text-[44px] leading-none [text-box-edge:cap_alphabetic] [text-box-trim:trim-both] md:text-[56px]">
                Today
              </DisplayAccent>
            </span>
          </h2>
          <p className="mt-3.5 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/70">
            Free for 100 conversations a month. No credit card required.
          </p>
          <div className="mt-8">
            <LandingActions channel={channel} agent={agent} stacked />
          </div>
        </div>
        <div className="relative mx-auto flex h-65.5 w-full max-w-90 items-center overflow-hidden rounded-[14px] border border-sapien-surface bg-[radial-gradient(ellipse_at_top_left,rgba(255,92,48,0.12),black_75%)]">
          <Image
            src="/images/landing/cta-chat.png"
            alt="An agent completes customer conversations and receives a reply."
            width={719}
            height={309}
            className="h-auto w-full"
            unoptimized
          />
        </div>
      </div>
      {agent ? (
        <div className="min-w-0">
          <AgentCards channel={channel} />
          <p className="mt-7 flex flex-wrap gap-4 font-sapien-mono text-[13px] leading-none tracking-tight text-sapien-foreground/50">
            {related.length > 0 ? (
              <>
                <span>{AGENTS[agent].name} on other channels:</span>
                {related.map((id) => (
                  <Link key={id} href={`/${id}/${agent}`} className="text-accent hover:underline">
                    {CHANNELS[id].name} →
                  </Link>
                ))}
              </>
            ) : (
              <Link href={`/${channel}`} className="text-accent hover:underline">
                All {CHANNELS[channel].name} features →
              </Link>
            )}
          </p>
        </div>
      ) : null}
    </SectionFrame>
  );
}

export function ChannelResources({ channel }: { channel: ChannelId }) {
  const items = [
    {
      label: 'docs',
      title: `${CHANNELS[channel].name} channel docs`,
      description: `Bots, invites, buttons and limits ${CHANNELS[channel].location}.`,
      readingTime: '8 min read',
      href: `/${channel}#setup`,
    },
    {
      label: 'docs',
      title: 'CLI reference',
      description: 'Every command for ask, approve, choose and tell.',
      readingTime: '8 min read',
      href: '/agents.md',
    },
    {
      label: 'blog',
      title: 'How to build a human-in-the-loop AI agent',
      description: 'A step-by-step guide with approvals over chat.',
      readingTime: '8 min read',
      href: '/sapien#building-blocks',
    },
    {
      label: 'blog',
      title: 'Agent Inbox vs AgentMail',
      description: 'How the two inboxes for agents compare.',
      readingTime: '5 min read',
      href: `/${channel}#agents`,
    },
  ];
  return (
    <SectionFrame anchor="resources" auditId="resources" className="pb-20">
      <div className="grid sm:grid-cols-2 md:grid-cols-4">
        {items.map((item) => (
          <Link
            key={item.title}
            href={item.href}
            className="flex min-h-53.25 flex-col border-b border-r border-sapien-border p-6 last:border-r-0 hover:bg-sapien-border/30"
          >
            <span className="font-sapien-mono text-[10px] leading-none tracking-[0.08em] text-accent">
              {item.label}
            </span>
            <h3 className="mt-4.5 text-lg leading-[23px] tracking-tight">{item.title}</h3>
            <p className="mt-2 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
              {item.description}
            </p>
            <span
              aria-hidden="true"
              className="mt-auto pt-5 font-sapien-mono text-[11px] leading-none tracking-tight text-sapien-foreground/50"
            >
              {item.readingTime}
            </span>
          </Link>
        ))}
      </div>
    </SectionFrame>
  );
}
