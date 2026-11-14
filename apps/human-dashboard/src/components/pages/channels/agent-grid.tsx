import Link from 'next/link';

import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENTS, type AgentId, type ChannelId, relatedAgents } from '@/data/channel-pages';

import { LandingHeading, LandingMark } from './shared';

/** Every agent's card; on an agent page, every agent but that one. */
export function AgentCards({ channel, exclude }: { channel: ChannelId; exclude?: AgentId }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
      {relatedAgents(exclude).map((agent) => (
        <Link
          key={agent}
          href={`/${channel}/${agent}`}
          className="group flex min-h-46.5 flex-col items-start rounded-xl border border-sapien-raised p-5 transition-colors hover:border-sapien-surface hover:bg-sapien-border/40 focus-visible:outline-2 focus-visible:outline-accent motion-reduce:transition-none"
        >
          <span className="flex size-12 items-center justify-center rounded-xl border border-sapien-border">
            <LandingMark name={agent} size={32} />
          </span>
          <h3 className="mt-7 text-lg leading-none tracking-tight">{AGENTS[agent].name}</h3>
          <p className="mt-2 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
            {AGENTS[agent].description}
          </p>
        </Link>
      ))}
    </div>
  );
}

export function AgentsSection({ channel }: { channel: ChannelId }) {
  return (
    <SectionFrame anchor="agents" auditId="agents" className="flex flex-col gap-14 px-4 py-20 md:px-8 md:py-30">
      <LandingHeading
        descriptionClassName="max-w-95"
        lead="Works with"
        accent="your agent"
        description="Pick your agent for setup steps and prompts written for it."
      />
      <div>
        <AgentCards channel={channel} />
        <p className="mt-7 flex flex-wrap gap-3 font-sapien-mono text-[13px] leading-none tracking-tight text-sapien-foreground/50">
          Using another agent?
          <Link href="/agents.md" className="text-accent hover:underline">
            Read the CLI docs →
          </Link>
        </p>
      </div>
    </SectionFrame>
  );
}
