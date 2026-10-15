import { MessageCircle, MessageSquare } from 'lucide-react';

import { ChannelIcon } from '@/components/channels/channel-icon';
import { isInboxChannel } from '@/lib/inbox';
import { cn } from '@/lib/utils';

/**
 * The sizes the inbox draws a channel's logo at: 16 in the channel menu, 20 in a row, 28 in the drawer.
 * The logo is the Channels table's 32px one, scaled as the design scales its `Channel logo`, so its
 * mark keeps its proportions at every size.
 */
const SCALES = {
  16: '[zoom:0.5]',
  20: '[zoom:0.625]',
  28: '[zoom:0.875]',
} as const;

export type ChannelLogoSize = keyof typeof SCALES;

export function ChannelLogo({ channel, size }: { channel: string; size: ChannelLogoSize }) {
  if (isInboxChannel(channel)) {
    return <ChannelIcon via={channel} className={SCALES[size]} />;
  }

  // A channel the dashboard has no logo for yet.
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-default',
        SCALES[size]
      )}
    >
      <MessageSquare className="size-4" />
    </span>
  );
}

/** The channels the menu says are on their way, at 16px like the others in it. */
export function ComingSoonLogos() {
  return (
    <span aria-hidden="true" className="flex items-center gap-2.5 opacity-50">
      <span className="flex size-4 items-center justify-center rounded-full bg-[#25d366] text-on-accent">
        <MessageCircle className="size-2.5" strokeWidth={2.5} />
      </span>
      <span className="flex size-4 items-center justify-center rounded-full bg-linear-to-b from-[#5df777] to-[#0abe2b] text-on-accent">
        <svg viewBox="0 0 32 32" className="size-2.5" fill="currentColor">
          <path d="M16 3C8.82 3 3 7.92 3 14c0 3.2 1.6 6.08 4.14 8.1-.22 2.04-1.14 3.66-1.14 3.66s3.12-.36 5.28-1.92c1.44.44 3 .68 4.72.68 7.18 0 13-4.92 13-11S23.18 3 16 3Z" />
        </svg>
      </span>
    </span>
  );
}
