import Link from 'next/link';

import { SectionFrame } from '@/components/sapien/section-frame';
import { AGENTS, type AgentId, CHANNELS, type ChannelId } from '@/data/channel-pages';

import { LandingHeading, LandingMark } from './shared';

export function ReachSection({ channel }: { channel: ChannelId }) {
  const items = [
    {
      title: 'Contacts',
      description: 'Everyone your agent can message, in one directory.',
      command: 'agentinbox contact list',
      icon: 'reach-3',
    },
    {
      title: 'Invites',
      description: `Link a teammate’s ${CHANNELS[channel].name} with a one-time link.`,
      command: `agentinbox contact invite maya --via ${channel}`,
      icon: 'reach-2',
    },
    {
      title: 'Screening',
      description: 'Messages from strangers wait for your OK before the agent sees them.',
      icon: 'reach-1',
    },
    {
      title: 'Pause',
      description: 'Mute the bot for one person or for everyone, and resume any time.',
      icon: 'reach-0',
    },
  ];
  return (
    <SectionFrame
      anchor="who-can-reach"
      auditId="who-can-reach"
      className="grid gap-8 px-4 py-20 md:grid-cols-[380px_minmax(0,1fr)] md:px-8 md:py-30"
    >
      <div>
        <LandingHeading lead="Who can" accent="reach your agent" />
        <p className="mt-6 max-w-95 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
          You decide who gets through. People you add can message your agent; everyone else waits in screening until you
          let them in.
        </p>
      </div>
      <div className="overflow-hidden rounded-[14px] border border-sapien-border">
        {items.map((item) => (
          <article key={item.title} className="flex gap-5 border-t border-sapien-border p-6 first:border-t-0">
            <LandingMark name={item.icon} />
            <div className="flex min-w-0 flex-col items-start">
              <h3 className="text-lg leading-none tracking-tight">{item.title}</h3>
              <p className="mt-2.5 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
                {item.description}
              </p>
              {item.command ? (
                <code className="mt-3 block max-w-full overflow-x-auto rounded bg-sapien-border px-2.5 py-1.5 font-sapien-mono text-xs leading-3 whitespace-nowrap text-sapien-foreground/50">
                  <span className="text-accent">$ </span>
                  {item.command}
                </code>
              ) : (
                <Link
                  href="/configure"
                  className="mt-3 block rounded bg-sapien-border px-2.5 py-1.5 font-sapien-mono text-xs leading-3 text-sapien-foreground/50 hover:text-accent"
                >
                  set on agentinbox.md
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}

const CAPABILITIES = [
  ['ask', 'Ask a question and get a typed reply'],
  ['choose', 'Offer options as tap-to-answer buttons'],
  ['tell', 'Send status updates without waiting'],
  ['invite', 'Bring teammates into the same bot'],
  ['screen', 'Keep strangers out with screening'],
] as const;

export function MoreCapabilities({ channel, agent }: { channel: ChannelId; agent: AgentId }) {
  return (
    <SectionFrame
      anchor="more-features"
      auditId="more-features"
      className="grid gap-8 px-4 py-20 md:grid-cols-[352px_minmax(0,1fr)] md:px-8 md:py-30"
    >
      <div>
        <LandingHeading lead="What else" accent="it can do" />
        <p className="mt-6 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
          Everything Agent Inbox does {CHANNELS[channel].location} works with {AGENTS[agent].name}.
        </p>
      </div>
      <div className="flex min-w-0 flex-col border-t border-sapien-border">
        {CAPABILITIES.map(([key, label]) => (
          <Link
            key={key}
            href={`/${channel}#${key === 'invite' || key === 'screen' ? 'who-can-reach' : 'message-types'}`}
            className="group flex min-h-14 items-center gap-4 border-b border-sapien-border py-4.5 text-lg leading-none tracking-tight hover:text-accent"
          >
            <span className="w-14 shrink-0 font-sapien-mono text-[11px] text-sapien-foreground/50">{key}</span>
            <span className="flex-1">{label}</span>
            <span aria-hidden="true" className="text-xl leading-5 text-accent">
              ↗
            </span>
          </Link>
        ))}
        <Link
          href={`/${channel}`}
          className="mt-5 block font-sapien-mono text-[13px] leading-none tracking-tight text-accent hover:underline"
        >
          All {CHANNELS[channel].name} features →
        </Link>
      </div>
    </SectionFrame>
  );
}
