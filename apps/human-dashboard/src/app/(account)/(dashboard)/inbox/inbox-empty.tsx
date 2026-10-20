import { Plus, Send } from 'lucide-react';
import Link from 'next/link';

import { CONFIGURE_PATH } from '@/components/dashboard/nav';
import { buttonClassName } from '@/components/ui/button';
import { MascotFace } from '@/components/ui/mascot-face';

type InboxEmptyProps = {
  /** What the agent is called in a sentence: its address without the domain. */
  handle: string;
  address: string;
  /** How many channels the agent can be reached on; `null` when that couldn't be read. */
  listening: number | null;
};

/**
 * The inbox before anyone wrote to the agent: the mascot, awake, following the pointer and blinking while it
 * waits, and two ways to get the first message in.
 */
export function InboxEmpty({ handle, address, listening }: InboxEmptyProps) {
  return (
    <section className="flex flex-col items-center gap-3.5 rounded-[10px] border border-border bg-background px-10 py-14">
      <MascotFace art="waiting" className="size-35" />
      <h2 className="text-base leading-5.5 font-medium text-foreground">Your agent’s inbox is empty</h2>
      <p className="w-115 max-w-full text-center text-[13px] leading-[19px] text-secondary">
        Messages to {handle} on any channel land here.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <a href={`mailto:${address}`} className={buttonClassName('primary')}>
          <Send aria-hidden="true" className="size-3.5" />
          Email your agent
        </a>
        <Link href={CONFIGURE_PATH} className={buttonClassName('secondary')}>
          <Plus aria-hidden="true" className="size-3.5" />
          Add a channel
        </Link>
      </div>
      {listening !== null && listening > 0 && (
        <p className="flex items-center gap-2 rounded bg-success/8 px-2.5 py-1.5 font-mono text-[11px] leading-4 text-success">
          <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-success" />
          Listening on {listening} {listening === 1 ? 'channel' : 'channels'}
        </p>
      )}
    </section>
  );
}
