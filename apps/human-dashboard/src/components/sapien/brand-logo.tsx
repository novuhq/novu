import { ChannelIcon } from '@/components/channels/channel-icon';
import { ComingSoonLogo } from '@/components/channels/coming-soon-logo';
import { HostLogo } from '@/components/connect/host-logo';
import { EmailMark } from '@/components/sapien/email-mark';
import { type HostId, hostOf } from '@/lib/hosts';
import { cn } from '@/lib/utils';

export type BrandChannel = 'email' | 'telegram' | 'slack' | 'whatsapp' | 'imessage';

export const CHANNEL_NAMES: Record<BrandChannel, string> = {
  email: 'Email',
  telegram: 'Telegram',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  imessage: 'iMessage',
};

/**
 * Both marks are drawn at 32px and zoomed, as the dashboard's inbox scales its `Channel logo`, so each mark
 * keeps its share of the circle at every size.
 */
const ZOOM = {
  14: '[zoom:0.4375]',
  16: '[zoom:0.5]',
  20: '[zoom:0.625]',
  24: '[zoom:0.75]',
  28: '[zoom:0.875]',
  32: '',
} as const;

export type BrandLogoSize = keyof typeof ZOOM;

export function ChannelLogo({
  channel,
  size = 20,
  className,
}: {
  channel: BrandChannel;
  size?: BrandLogoSize;
  className?: string;
}) {
  if (channel === 'email') {
    return (
      <span
        aria-hidden="true"
        className={cn('block size-8 shrink-0 overflow-hidden rounded-full', ZOOM[size], className)}
      >
        <EmailMark />
      </span>
    );
  }

  if (channel === 'whatsapp' || channel === 'imessage') {
    return (
      <span aria-hidden="true" className={cn('block shrink-0', ZOOM[size], className)}>
        <ComingSoonLogo via={channel} size={32} />
      </span>
    );
  }

  return <ChannelIcon via={channel} className={cn(ZOOM[size], className)} />;
}

/**
 * A channel's mark on a rounded app tile, like the agents' own logos, so channels and agents read as one set
 * wherever they sit side by side. Drawn at 32px and zoomed like `ChannelLogo`.
 */
export function ChannelTile({
  channel,
  size = 20,
  className,
}: {
  channel: BrandChannel;
  size?: BrandLogoSize;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn('relative block size-8 shrink-0 overflow-hidden rounded-[7px]', ZOOM[size], className)}
    >
      <TileMark channel={channel} />
      <span className="absolute inset-0 rounded-[inherit] ring-1 ring-white/10 ring-inset" />
    </span>
  );
}

function TileMark({ channel }: { channel: BrandChannel }) {
  if (channel === 'email') return <EmailMark crop="square" />;
  if (channel === 'whatsapp' || channel === 'imessage') {
    return <ComingSoonLogo via={channel} size={32} className="rounded-none" />;
  }

  return <ChannelIcon via={channel} className={cn('rounded-none', channel === 'slack' && 'bg-white')} />;
}

/** A channel's tile and name, as a small chip. */
export function ChannelChip({ channel, className }: { channel: BrandChannel; className?: string }) {
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 rounded-md border border-sapien-border py-1 pr-2 pl-1 font-sapien-mono text-[11px] leading-none tracking-tight text-sapien-foreground/60',
        className
      )}
    >
      <ChannelTile channel={channel} size={16} />
      {CHANNEL_NAMES[channel]}
    </span>
  );
}

type AgentLogoSize = 'small' | 'medium' | 'large';

/** An agent's own logo (Claude, ChatGPT, Grok…) on its rounded tile, from `public/tools`. */
export function AgentLogo({
  agent,
  size = 'medium',
  className,
}: {
  agent: HostId;
  size?: AgentLogoSize;
  className?: string;
}) {
  return <HostLogo host={hostOf(agent)} size={size} className={className} />;
}

/** A row of logos, each named for screen readers once, by the list. */
export function AgentLogoRow({
  agents,
  size = 'medium',
  className,
}: {
  agents: readonly HostId[];
  size?: 'small' | 'medium' | 'large';
  className?: string;
}) {
  return (
    <ul aria-label={agents.map((agent) => hostOf(agent).name).join(', ')} className={cn('flex', className)}>
      {agents.map((agent) => (
        <li key={agent} className="flex">
          <AgentLogo agent={agent} size={size} />
        </li>
      ))}
    </ul>
  );
}
