import { ChannelIcon } from '@/components/channels/channel-icon';
import type { ChannelVia } from '@/lib/human-channels-api';
import { cn } from '@/lib/utils';

/** The channels the Configure page lists as coming soon. */
export type ComingSoonVia = 'whatsapp' | 'imessage';

type ChannelLogoProps = {
  via: ChannelVia | ComingSoonVia;
  /** 16 on the agent's card, 24 in the list of channels. */
  size: 16 | 24;
};

/**
 * The design's `Channel logo` at the two sizes this page draws it. The mark inside keeps the share of the
 * circle it has in the design, which isn't the 32px icon's share scaled down.
 */
const MARK: Record<ChannelVia, Record<ChannelLogoProps['size'], string>> = {
  email: { 16: 'size-4 [&>svg]:size-2.25', 24: 'size-6 [&>svg]:size-3' },
  telegram: { 16: 'size-4 [&>svg]:size-2.5', 24: 'size-6 [&>svg]:size-3.5' },
  slack: { 16: 'size-4 [&>svg]:size-3', 24: 'size-6 [&>svg]:size-4.75' },
};

export function ChannelLogo({ via, size }: ChannelLogoProps) {
  if (via === 'whatsapp' || via === 'imessage') {
    return <ComingSoonLogo via={via} size={size} />;
  }

  return <ChannelIcon via={via} className={MARK[via][size]} />;
}

/** WhatsApp and iMessage: a green circle with the app's white mark. */
function ComingSoonLogo({ via, size }: { via: ComingSoonVia; size: ChannelLogoProps['size'] }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full text-white',
        size === 16 ? 'size-4' : 'size-6',
        via === 'whatsapp' ? 'bg-[#25d366]' : 'bg-linear-to-b from-[#5df777] to-[#0abe2b]'
      )}
    >
      {via === 'whatsapp' ? (
        <svg viewBox="0 0 24 24" className="size-[62%]" fill="none">
          <path
            d="M12 3.4a8.6 8.6 0 0 0-7.4 13l-1.2 4.2 4.3-1.1A8.6 8.6 0 1 0 12 3.4Z"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <path
            fill="currentColor"
            d="M9.1 7.6c.2-.4.4-.4.7-.4h.5c.2 0 .4.1.5.4l.8 1.9c.1.2 0 .5-.1.7l-.5.6c-.1.2-.2.4 0 .6.6 1 1.4 1.8 2.4 2.4.2.1.4.1.6-.1l.6-.6c.2-.2.4-.2.6-.1l1.9.8c.3.1.4.3.4.5v.5c0 .5-.3 1-.8 1.3-.6.3-1.4.4-2.4.1-1.6-.5-3.5-2-4.6-3.6-.9-1.3-1.2-2.6-1-3.6.1-.5.2-.8.4-1Z"
          />
        </svg>
      ) : (
        <svg viewBox="0 0 32 32" className="size-[58%]" fill="currentColor">
          <path d="M16 3C8.82 3 3 7.92 3 14c0 3.2 1.6 6.08 4.14 8.1-.22 2.04-1.14 3.66-1.14 3.66s3.12-.36 5.28-1.92c1.44.44 3 .68 4.72.68 7.18 0 13-4.92 13-11S23.18 3 16 3Z" />
        </svg>
      )}
    </span>
  );
}
