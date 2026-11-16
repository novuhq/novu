import Link from 'next/link';

import { CopyCommand } from '@/components/sapien/copy-command';
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
            <div className="flex min-w-0 flex-1 flex-col items-start">
              <h3 className="text-lg leading-none tracking-tight">{item.title}</h3>
              <p className="mt-2 text-[15px] leading-[21px] tracking-tight text-sapien-foreground/50">
                {item.description}
              </p>
              {item.command ? (
                <CopyCommand
                  command={item.command}
                  label={`${item.title} command`}
                  variant="icon"
                  appearance="surface"
                  className="mt-3 w-full"
                />
              ) : (
                <Link
                  href="/configure"
                  className="mt-3 flex min-h-10 items-center justify-center rounded-lg bg-sapien-border px-6 py-2 text-[15px] font-medium tracking-tight transition-colors hover:bg-sapien-surface motion-reduce:transition-none"
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
      <div className="min-w-0">
        <div className="overflow-hidden rounded-xl border border-sapien-border">
          {CAPABILITIES.map(({ label: key, description: label, anchor }) => (
            <Link
              key={key}
              href={`/${channel}#${anchor}`}
              className="group flex min-h-14 items-center gap-4 border-b border-sapien-border p-3 last:border-b-0 transition-colors hover:bg-sapien-border/50 motion-reduce:transition-none"
            >
              <span className="flex min-w-0 flex-1 flex-col gap-2">
                <span className="font-sapien-mono text-[13px] leading-none text-accent">{key}</span>
                <span className="text-lg leading-[23px] tracking-tight">{label}</span>
              </span>
              <LandingMark name="arrow-up-right" size={20} />
            </Link>
          ))}
        </div>
        <Link
          href={`/${channel}`}
          className="mt-5 flex min-h-10 w-full items-center justify-center rounded-lg bg-sapien-border px-6 py-2 text-[15px] font-medium tracking-tight transition-colors hover:bg-sapien-surface motion-reduce:transition-none"
        >
          All {CHANNELS[channel].name} features →
        </Link>
      </div>
    </SectionFrame>
  );
}
