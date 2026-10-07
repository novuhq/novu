import { Mail } from 'lucide-react';

import type { ChannelVia } from '@/lib/human-channels-api';
import { cn } from '@/lib/utils';

/** The round brand mark of a channel, as in the Channels table and the setup drawers. */
export function ChannelIcon({ via, className }: { via: ChannelVia; className?: string }) {
  const frame = cn('flex size-8 shrink-0 items-center justify-center rounded-full', className);

  if (via === 'email') {
    return (
      <span aria-hidden="true" className={cn(frame, 'bg-accent text-on-accent')}>
        <Mail className="size-4" />
      </span>
    );
  }

  if (via === 'telegram') {
    return (
      <span aria-hidden="true" className={cn(frame, 'bg-telegram text-on-accent')}>
        <svg viewBox="0 0 24 24" className="size-4.5 -translate-x-px" fill="currentColor">
          <path d="M20.7 3.3 2.9 10.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.5-1.8-1.6-1.3Z" />
        </svg>
      </span>
    );
  }

  return (
    <span aria-hidden="true" className={frame}>
      <svg viewBox="0 0 24 24" className="size-5.5">
        <path
          fill="#e01e5a"
          d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313z"
        />
        <path
          fill="#36c5f0"
          d="M8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312z"
        />
        <path
          fill="#2eb67d"
          d="M18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zm-1.268 0a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312z"
        />
        <path
          fill="#ecb22e"
          d="M15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zm0-1.268a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"
        />
      </svg>
    </span>
  );
}
