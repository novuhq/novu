import { ChannelIcon } from '@/components/channels/channel-icon';
import { ComingSoonLogo, type ComingSoonVia } from '@/components/channels/coming-soon-logo';
import type { ChannelVia } from '@/lib/human-channels-api';

export { ComingSoonLogo, type ComingSoonVia };

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
