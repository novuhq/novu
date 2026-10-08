import type { InviteChannelVia } from '@/lib/invite-api';
import { cn } from '@/lib/utils';

type AppIconSize = 'small' | 'medium' | 'large';

/** 16px next to a sender's name, 28px in the list of apps, 40px at the top of an app's steps. */
const SIZES: Record<AppIconSize, string> = {
  small: 'size-4',
  medium: 'size-7',
  large: 'size-10',
};

type AppIconProps = {
  via: InviteChannelVia;
  size?: AppIconSize;
  className?: string;
};

/** The mark of a chat app an invite can offer: Telegram's blue disc, Slack's four-color logo. */
export function AppIcon({ via, size = 'medium', className }: AppIconProps) {
  if (via === 'telegram') {
    return (
      <span
        aria-hidden="true"
        className={cn(
          'flex shrink-0 items-center justify-center rounded-full bg-telegram text-white',
          SIZES[size],
          className
        )}
      >
        <svg viewBox="0 0 24 24" className="size-[58%] -translate-x-[4%]" fill="currentColor">
          <path d="M20.7 3.3 2.9 10.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.5-1.8-1.6-1.3Z" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center', SIZES[size], className)}>
      <svg viewBox="0 0 122.8 122.8" className="size-[78%]">
        <path
          fill="#e01e5a"
          d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.5 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z"
        />
        <path
          fill="#36c5f0"
          d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.5c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z"
        />
        <path
          fill="#2eb67d"
          d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.5 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C64.7 5.8 70.5 0 77.6 0s12.9 5.8 12.9 12.9v32.3z"
        />
        <path
          fill="#ecb22e"
          d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.5c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z"
        />
      </svg>
    </span>
  );
}
