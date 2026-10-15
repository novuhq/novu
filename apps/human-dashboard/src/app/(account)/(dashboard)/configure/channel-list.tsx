'use client';

import { ChevronRight, Plus } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button, SMALL_BUTTON } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import type { ChannelVia } from '@/lib/human-channels-api';
import type { ChannelRow } from '@/lib/human-channels-overview';
import { cn } from '@/lib/utils';

import { ChannelLogo, type ComingSoonVia } from './channel-logo';

/** The section labels of the Configure page: CHANNELS, and SETTINGS once it's there (NV-9039). */
export const SECTION_LABEL = 'font-mono text-[11px] leading-4 font-medium tracking-[0.66px] text-muted uppercase';

const ROW = 'relative flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0';

/** The button that opens a row's drawer reaches over the whole row, so the row is the bigger target for a pointer. */
const WHOLE_ROW = 'after:absolute after:inset-0 after:content-[""]';

const COMING_SOON: { via: ComingSoonVia; name: string }[] = [
  { via: 'whatsapp', name: 'WhatsApp' },
  { via: 'imessage', name: 'iMessage' },
];

type ChannelListProps = {
  /** How the agent is called in a sentence: its address without the domain. */
  handle: string;
  channels: ChannelRow[];
  /** What the connected channel's row says under its name: the address, the bot, the app and its workspace. */
  details: Partial<Record<ChannelVia, string>>;
  onOpen: (via: ChannelVia) => void;
};

/** CHANNELS: every way people reach the agent, each opening its drawer, and the ones still to come. */
export function ChannelList({ handle, channels, details, onOpen }: ChannelListProps) {
  return (
    <section className="overflow-hidden rounded-[10px] border border-border">
      <header className="flex items-center gap-2 border-b border-border bg-subtle px-4 py-3">
        <h2 className={SECTION_LABEL}>Channels</h2>
        <p className="ml-auto text-xs leading-4 text-muted">Each one is {handle}’s own</p>
      </header>
      <ul>
        {channels.map((channel) => (
          <ChannelListRow
            key={channel.via}
            channel={channel}
            detail={details[channel.via]}
            onOpen={() => onOpen(channel.via)}
          />
        ))}
        {COMING_SOON.map(({ via, name }) => (
          <li key={via} className={ROW}>
            <ChannelLogo via={via} size={24} />
            <RowText name={name} dim>
              <p className="truncate text-xs leading-4 text-secondary">Coming soon</p>
            </RowText>
            <Button
              variant="secondary"
              className={SMALL_BUTTON}
              // Nothing records the request yet: the toast is all there is until the product has a place for it.
              onClick={() => toast('Access requested', 'success', 'We’ll email you when this channel is available.')}
            >
              Request access
              <span className="sr-only"> to {name}</span>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

type ChannelListRowProps = {
  channel: ChannelRow;
  detail?: string;
  onOpen: () => void;
};

function ChannelListRow({ channel, detail, onOpen }: ChannelListRowProps) {
  const { connected, name } = channel;

  return (
    <li className={cn(ROW, 'transition-colors duration-150 hover:bg-raised motion-reduce:transition-none')}>
      <ChannelLogo via={channel.via} size={24} />
      <RowText name={name} dim={!connected}>
        {/* A new key when the channel connects, so its new line fades in. */}
        <p
          key={String(connected)}
          className={cn(
            'animate-overlay-in truncate text-xs leading-4 text-secondary motion-reduce:animate-none',
            connected && 'font-mono'
          )}
        >
          {connected ? (detail ?? channel.placeholder) : channel.placeholder}
        </p>
      </RowText>
      {connected ? (
        <>
          <span className="flex shrink-0 items-center gap-1.5 font-mono text-[11px] leading-3.5 text-secondary">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-success" />
            connected
          </span>
          <Button variant="quiet" className={cn(SMALL_BUTTON, WHOLE_ROW)} onClick={onOpen}>
            Manage
            <span className="sr-only"> {name}</span>
          </Button>
          <ChevronRight aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
        </>
      ) : (
        <Button variant="secondary" className={cn(SMALL_BUTTON, WHOLE_ROW)} onClick={onOpen}>
          <Plus aria-hidden="true" className="size-3.5" />
          Set up
          <span className="sr-only"> {name}</span>
        </Button>
      )}
    </li>
  );
}

function RowText({ name, dim, children }: { name: string; dim: boolean; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
      <h3 className={cn('text-[13px] leading-4.5 font-medium', dim ? 'text-default' : 'text-foreground')}>{name}</h3>
      {children}
    </div>
  );
}
