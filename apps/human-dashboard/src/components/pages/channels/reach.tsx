import Link from 'next/link';

import { SectionFrame } from '@/components/sapien/section-frame';
import { CAPABILITIES, CHANNELS, type ChannelId, channelHub } from '@/data/channel-pages';

import { LandingHeading, LandingMark } from './shared';

export function ReachSection({ channel }: { channel: ChannelId }) {
  const icons = ['reach-3', 'reach-2', 'reach-1', 'reach-0'];
  const items = channelHub(channel).reach.map((item, index) => ({ ...item, icon: icons[index] }));
  return (
    <SectionFrame
      anchor="who-can-reach"
      auditId="who-can-reach"
      className="grid gap-8 px-4 py-20 md:grid-cols-[380px_minmax(0,1fr)] md:px-8 md:py-30"
    >
      <div>
        <LandingHeading lead="Who can" accent="reach your agent" />
      </div>
      <div className="overflow-hidden rounded-[14px] border border-sapien-border">
        {items.map((item) => (
          <article
            key={item.title}
            className="flex items-start gap-5 border-t border-sapien-border p-6 first:border-t-0"
          >
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
                  Configure on agentinbox.md →
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
    </SectionFrame>
  );
}

export function MoreCapabilities({ channel }: { channel: ChannelId }) {
  return (
    <SectionFrame
      anchor="more-features"
      auditId="more-features"
      className="grid gap-8 px-4 py-20 md:grid-cols-[352px_minmax(0,1fr)] md:px-8 md:py-30"
    >
      <div>
        <LandingHeading lead="What else" accent="it can do" />
        <p className="mt-6 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
          Everything your agent gets on {CHANNELS[channel].name}.
        </p>
      </div>
      <div className="flex min-w-0 flex-col border-t border-sapien-border">
        {CAPABILITIES.map(({ label: key, description: label, anchor }) => (
          <Link
            key={key}
            href={`/${channel}#${anchor}`}
            className="group flex min-h-14 items-center gap-4 border-b border-sapien-border py-4.5 text-lg leading-none tracking-tight hover:text-accent"
          >
            <span className="w-14 shrink-0 font-sapien-mono text-[11px] text-sapien-foreground/50">{key}</span>
            <span className="flex-1">{label}</span>
            <LandingMark name="arrow-up-right" size={20} />
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
