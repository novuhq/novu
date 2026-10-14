'use client';

import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { Check, ChevronDown, Inbox, Search } from 'lucide-react';
import { type ReactNode, useEffect, useRef, useState } from 'react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import {
  channelName,
  INBOX_CHANNELS,
  INBOX_SEARCH_MAX_LENGTH,
  INBOX_TAB_LABELS,
  INBOX_TABS,
  type InboxCounts,
  type InboxTab,
  type InboxView,
} from '@/lib/inbox';
import { cn } from '@/lib/utils';

import { ChannelLogo, ComingSoonLogos } from './channel-logo';

/** How long typing pauses before the search runs. */
const SEARCH_DELAY_MS = 300;

/** The value the menu gives "All channels". */
const ALL_CHANNELS = 'all';

type InboxToolbarProps = {
  view: InboxView;
  counts: InboxCounts;
  onChange: (view: InboxView, history: 'push' | 'replace') => void;
};

/** The tabs on the left, the search and the channel filter on the right. */
export function InboxToolbar({ view, counts, onChange }: InboxToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-y-2 border-b border-border">
      <div role="tablist" aria-label="Threads" className="flex items-center">
        {INBOX_TABS.map((tab) => (
          <TabButton
            key={tab}
            tab={tab}
            active={view.tab === tab}
            count={tabCount(tab, counts)}
            onSelect={() => onChange({ ...view, tab }, 'push')}
          />
        ))}
      </div>
      <div className="flex w-full items-center gap-2 pb-1.5 sm:ml-auto sm:w-auto sm:pb-0">
        <SearchField search={view.search ?? ''} onSearch={(search) => onChange({ ...view, search }, 'replace')} />
        <ChannelMenu view={view} counts={counts} onChange={onChange} />
      </div>
    </div>
  );
}

/**
 * The number on a tab, as the design colours it: All and Waiting in the accent while they hold threads,
 * New always muted, and Resolved without one.
 */
function tabCount(tab: InboxTab, counts: InboxCounts): { value: string; accent: boolean } | null {
  if (tab === 'resolved') {
    return null;
  }

  const value = counts.tabs[tab] ?? 0;

  return {
    value: `${value}${counts.capped && value > 0 ? '+' : ''}`,
    accent: value > 0 && tab !== 'unread',
  };
}

type TabButtonProps = {
  tab: InboxTab;
  active: boolean;
  count: { value: string; accent: boolean } | null;
  onSelect: () => void;
};

function TabButton({ tab, active, count, onSelect }: TabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'flex cursor-pointer items-center gap-1.5 border-b-2 px-3 pt-2 pb-2.5 text-[13px] leading-4.5 transition-colors focus-visible:outline-offset-[-2px] motion-reduce:transition-none',
        active ? 'border-accent font-medium text-foreground' : 'border-transparent text-secondary hover:text-foreground'
      )}
    >
      {INBOX_TAB_LABELS[tab]}
      {count && (
        <span
          className={cn('font-mono text-[11px] leading-4 font-normal', count.accent ? 'text-accent' : 'text-muted')}
        >
          {count.value}
        </span>
      )}
    </button>
  );
}

/** Searches as the operator types, once they pause, and at once on Enter. Escape clears it. */
function SearchField({ search, onSearch }: { search: string; onSearch: (search: string) => void }) {
  const [text, setText] = useState(search);
  // What was searched for last, so a pause after typing back to it searches nothing new.
  const sent = useRef(search);
  // The latest callback, so a new one on every render of the page doesn't restart the pause.
  const latestOnSearch = useRef(onSearch);

  useEffect(() => {
    latestOnSearch.current = onSearch;
  });

  useEffect(() => {
    if (text.trim() === sent.current.trim()) {
      return;
    }

    const timer = setTimeout(() => {
      sent.current = text;
      latestOnSearch.current(text.trim());
    }, SEARCH_DELAY_MS);

    return () => clearTimeout(timer);
  }, [text]);

  function runNow(next: string) {
    sent.current = next;
    onSearch(next.trim());
  }

  return (
    <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-border-strong bg-background px-2.5 transition-[border-color,box-shadow] focus-within:border-accent focus-within:shadow-[0_0_0_3px] focus-within:shadow-accent/20 motion-reduce:transition-none sm:w-55 sm:flex-none">
      <Search aria-hidden="true" className="size-3.5 shrink-0 text-muted" />
      <span className="sr-only">Search threads</span>
      <input
        type="text"
        value={text}
        maxLength={INBOX_SEARCH_MAX_LENGTH}
        placeholder="Search threads"
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            runNow(text);
          } else if (event.key === 'Escape' && text) {
            setText('');
            runNow('');
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-[13px] leading-4.5 text-foreground outline-none placeholder:text-muted"
      />
    </label>
  );
}

function ChannelMenu({ view, counts, onChange }: InboxToolbarProps) {
  const selected = view.channel ?? ALL_CHANNELS;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex h-8 shrink-0 cursor-pointer items-center gap-2 rounded-md whitespace-nowrap border border-border-strong bg-subtle px-2.5 text-[13px] leading-4.5 font-medium text-foreground transition-colors data-[state=open]:border-accent/60 motion-reduce:transition-none">
        {view.channel ? channelName(view.channel) : 'All channels'}
        <ChevronDown aria-hidden="true" className="size-3.5 text-secondary" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        sideOffset={5}
        className="w-55 min-w-0 border-border-strong bg-raised shadow-[0_12px_32px_rgb(0_0_0/0.5)]"
      >
        <DropdownMenuPrimitive.RadioGroup
          value={selected}
          onValueChange={(channel) =>
            onChange({ ...view, channel: channel === ALL_CHANNELS ? undefined : channel }, 'push')
          }
        >
          <ChannelItem
            value={ALL_CHANNELS}
            icon={<Inbox aria-hidden="true" className="size-4 text-secondary" />}
            label="All channels"
            count={counts.channels.all ?? 0}
          />
          {INBOX_CHANNELS.map((channel) => (
            <ChannelItem
              key={channel}
              value={channel}
              icon={<ChannelLogo channel={channel} size={16} />}
              label={channelName(channel)}
              count={counts.channels[channel] ?? 0}
            />
          ))}
        </DropdownMenuPrimitive.RadioGroup>
        <DropdownMenuPrimitive.Separator className="h-px bg-border" />
        <DropdownMenuPrimitive.Label className="flex items-center gap-2.5 px-2 py-1.75 text-[13px] leading-4.5 text-muted">
          <ComingSoonLogos />
          Coming soon
          <span className="sr-only">: WhatsApp and iMessage</span>
        </DropdownMenuPrimitive.Label>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ChannelItemProps = { value: string; icon: ReactNode; label: string; count: number };

function ChannelItem({ value, icon, label, count }: ChannelItemProps) {
  return (
    <DropdownMenuPrimitive.RadioItem
      value={value}
      className="flex cursor-pointer items-center gap-2.5 rounded-[5px] px-2 py-1.75 text-[13px] leading-4.5 text-default outline-none select-none data-highlighted:bg-border-strong/40 data-[state=checked]:bg-border-strong/60 data-[state=checked]:font-medium data-[state=checked]:text-foreground"
    >
      {icon}
      <span className="flex-1">{label}</span>
      <span className="font-mono text-[11px] leading-3.5 font-normal text-muted">{count}</span>
      {/* The check's place is kept on every item, so the counts line up. */}
      <span className="flex size-3.5 shrink-0 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <Check aria-hidden="true" className="size-3.5 text-accent" />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
    </DropdownMenuPrimitive.RadioItem>
  );
}
