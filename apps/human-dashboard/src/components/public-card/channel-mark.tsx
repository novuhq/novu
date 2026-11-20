import { ChannelLogo } from '@/app/(account)/(dashboard)/configure/channel-logo';
import type { ChannelVia } from '@/lib/human-channels-api';
import { cn } from '@/lib/utils';

/**
 * The two sizes the public card's page draws a channel's logo at, which the Configure page doesn't: 13.565px
 * on the card's lines (the design draws them at 113%) and 20px in the list of ways to reach the agent. Each is
 * the Configure page's nearest logo, scaled.
 */
const SIZES = {
  line: { box: 'size-[13.565px]', drawn: 16, scale: 'scale-[0.8478]' },
  row: { box: 'size-5', drawn: 24, scale: 'scale-[0.8333]' },
} as const;

/** A channel's logo (`ChannelLogo`) at one of the public card's own sizes. */
export function ChannelMark({ via, size }: { via: ChannelVia; size: keyof typeof SIZES }) {
  const { box, drawn, scale } = SIZES[size];

  return (
    <span aria-hidden="true" className={cn('shrink-0', box)}>
      <span className={cn('block origin-top-left', scale)}>
        <ChannelLogo via={via} size={drawn} />
      </span>
    </span>
  );
}
