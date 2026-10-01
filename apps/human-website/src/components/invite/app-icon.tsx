import type { InviteChannelVia } from '@/lib/invite-api';

/** Simple monochrome glyphs for the apps an invite can offer. */
export function AppIcon({ via }: { via: InviteChannelVia }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-8.5 shrink-0 items-center justify-center rounded border border-border bg-black text-foreground"
    >
      <svg viewBox="0 0 24 24" className="size-4.5" fill="currentColor">
        {via === 'telegram' ? (
          <path d="M20.7 3.3 2.9 10.2c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.6.1.9.8.9.5 0 .7-.2 1-.5l2.2-2.1 4.6 3.4c.8.5 1.4.2 1.6-.8l3-14.1c.3-1.2-.5-1.8-1.6-1.3Z" />
        ) : via === 'email' ? (
          <path d="M3.5 6.5A1.5 1.5 0 0 1 5 5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5v-11Zm1.7.7 6.3 4.5a.8.8 0 0 0 .9 0l6.3-4.5H5.2Zm13.3 1.7-5.7 4.1a2.3 2.3 0 0 1-2.6 0L4.5 8.9v9.1h14V8.9Z" />
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
