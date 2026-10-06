import type { InviteChannelVia } from '@/lib/invite-api';
import { cn } from '@/lib/utils';

type AppIconSize = 'small' | 'medium' | 'large';

const TILES: Record<AppIconSize, string> = {
  small: 'size-5 rounded-sm',
  medium: 'size-9 rounded-md',
  large: 'size-12 rounded-lg',
};

const GLYPHS: Record<AppIconSize, string> = {
  small: 'size-3',
  medium: 'size-4.5',
  large: 'size-6',
};

const COLORS: Record<InviteChannelVia, string> = {
  telegram: 'text-telegram',
  slack: 'text-slack',
};

type AppIconProps = {
  via: InviteChannelVia;
  size?: AppIconSize;
  className?: string;
};

/** Simple glyphs, in each app's brand color, for the chat apps an invite can offer. */
export function AppIcon({ via, size = 'medium', className }: AppIconProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center border border-border bg-background',
        TILES[size],
        COLORS[via],
        className
      )}
    >
      <svg viewBox="0 0 24 24" className={GLYPHS[size]} fill="currentColor">
        {via === 'telegram' ? (
          <path d="M20.7 3.3 2.9 10.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.5-1.8-1.6-1.3Z" />
        ) : (
          <>
            <rect x="9" y="2.5" width="3" height="9" rx="1.5" />
            <rect x="12.5" y="9" width="9" height="3" rx="1.5" />
            <rect x="12" y="12.5" width="3" height="9" rx="1.5" />
            <rect x="2.5" y="12" width="9" height="3" rx="1.5" />
          </>
        )}
      </svg>
    </span>
  );
}
