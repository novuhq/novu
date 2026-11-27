import { useInfiniteQuery } from '@tanstack/react-query';
import { type KeyboardEvent, type ReactNode, type RefObject, useEffect, useMemo, useRef, useState } from 'react';
import type { IconType } from 'react-icons';
import { RiAddLine, RiChat3Line, RiCloseLine, RiLoader4Line, RiRouteFill, RiSearchLine } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { Kbd } from '@/components/primitives/kbd';
import { ToggleGroup, ToggleGroupItem } from '@/components/primitives/toggle-group';
import { NOVU_COPILOT_AGENT_ID } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';
import {
  type CopilotConversationOrigin,
  type CopilotHistoryItem,
  type CopilotHistoryScope,
  formatConversationTime,
  getHistorySections,
  splitTitleMatches,
  toHistoryItems,
} from './copilot-conversation-history';
import { CopilotEmptyHero } from './copilot-empty-hero';
import { COPILOT_PAGE_CONFIGS } from './copilot-pages';
import { readStoredCopilotTitle, writeStoredCopilotTitle } from './copilot-popover-title';
import { CopilotThinkingIndicator } from './copilot-thread-parts';
import { useCopilotWebChat } from './copilot-web-chat-context';

// The list holds every agent's chats with this subscriber; the Copilot's are picked out of each page.
const PAGE_SIZE = 50;
// Pages loaded on their own while none holds a Copilot chat; past that, "Load older chats" goes on.
const MAX_LOOKUP_PAGES = 5;

const SCOPES: ReadonlyArray<{ value: CopilotHistoryScope; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'this-page', label: 'This page' },
];

function isHistoryScope(value: string): value is CopilotHistoryScope {
  return SCOPES.some((scope) => scope.value === value);
}

/** The page's navigation icon and name, or the workflow's identifier; a chat started elsewhere names neither. */
function getOriginDisplay(origin: CopilotConversationOrigin | undefined): { label?: string; icon: IconType } {
  if (origin?.page) {
    const chip = COPILOT_PAGE_CONFIGS[origin.page]?.chip;

    return { label: chip?.label, icon: chip?.icon ?? RiChat3Line };
  }

  if (origin?.workflowId) return { label: origin.workflowLabel, icon: RiRouteFill };

  return { icon: RiChat3Line };
}

function SearchField({
  inputRef,
  value,
  onChange,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stroke-soft bg-bg-weak py-1.5 pl-2.5 pr-1.5 transition-shadow focus-within:border-stroke-sub focus-within:shadow-[0_0_0_2px_rgba(0,0,0,0.1)]">
      <RiSearchLine className="size-3.5 shrink-0 text-text-soft" aria-hidden />
      <input
        ref={inputRef}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search chats"
        aria-label="Search chats"
        className="min-w-0 flex-1 bg-transparent text-[13px] leading-[18px] text-text-strong outline-none placeholder:text-text-soft"
      />
      {value ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            inputRef.current?.focus();
          }}
          className="flex size-4 shrink-0 items-center justify-center text-text-soft transition-colors hover:text-text-sub"
        >
          <RiCloseLine className="size-[13px]" aria-hidden />
        </button>
      ) : (
        <Kbd variant="flat" aria-hidden className="font-code font-normal text-text-soft">
          /
        </Kbd>
      )}
    </div>
  );
}

function HistoryRow({
  item,
  query,
  now,
  isCurrent,
  isWorking,
  isDisabled,
  onSelect,
}: {
  item: CopilotHistoryItem;
  query: string;
  now: Date;
  isCurrent: boolean;
  isWorking: boolean;
  isDisabled: boolean;
  onSelect: (item: CopilotHistoryItem) => void;
}) {
  const { label, icon: Icon } = getOriginDisplay(item.origin);
  const meta = [label, formatConversationTime(item.lastActivityAt, now)].filter(Boolean).join(' · ');
  const isSearching = query.trim().length > 0;
  let offset = 0;

  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(item)}
        disabled={isDisabled}
        aria-current={isCurrent ? 'true' : undefined}
        title={isDisabled ? 'Wait for the Copilot to finish' : item.title}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg px-2 py-[7px] text-left outline-none transition-colors hover:bg-bg-weak focus-visible:bg-bg-weak focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-stroke-strong disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
          isCurrent && 'bg-bg-weak'
        )}
      >
        <span className="flex size-[26px] shrink-0 items-center justify-center rounded-md border border-stroke-soft bg-bg-white">
          <Icon className="size-3.5 text-text-sub" aria-hidden />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span
            className={cn('truncate text-[13px] leading-[18px]', isSearching ? 'text-text-soft' : 'text-text-strong')}
          >
            {splitTitleMatches(item.title, query).map((segment) => {
              const key = offset;
              offset += segment.text.length;

              return segment.isMatch ? (
                <mark key={key} className="bg-transparent text-text-strong">
                  {segment.text}
                </mark>
              ) : (
                <span key={key}>{segment.text}</span>
              );
            })}
          </span>
          {meta && <span className="truncate text-[11px] leading-4 text-text-soft">{meta}</span>}
        </span>
        {isWorking && (
          <span className="flex shrink-0 items-center gap-1 text-[11px] leading-4 text-text-sub">
            <RiLoader4Line className="size-[13px] animate-spin" aria-hidden />
            Working
          </span>
        )}
      </button>
    </li>
  );
}

function HistorySection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section aria-label={label}>
      <h3 className="pb-1 pl-2 pt-2.5 font-code text-[11px] uppercase leading-4 text-text-soft">{label}</h3>
      <ul className="flex flex-col gap-0.5">{children}</ul>
    </section>
  );
}

/** Why the list has no rows: nothing matches the search, no Copilot chat is loaded yet, or none is from this page. */
function getEmptyListMessage(query: string, hasLoadedChats: boolean): string {
  if (query) return `No chats match “${query}”`;
  if (!hasLoadedChats) return 'No chats found yet';

  return 'No chats on this page yet';
}

function CenteredStatus({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 text-center">{children}</div>;
}

/**
 * The Copilot's earlier chats with this user, newest first, shown in place of the conversation. Picking one resumes
 * it; switching is held back while the open chat is still answering, since its reply and workflow edits would be lost.
 */
export function CopilotHistoryPanel() {
  const {
    isAvailable,
    isConnecting,
    chat,
    isBusy,
    pageContext,
    listConversations,
    resumeConversation,
    startNewConversation,
  } = useCopilotWebChat();
  const { currentUser, currentOrganization } = useAuth();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<CopilotHistoryScope>('all');
  const searchRef = useRef<HTMLInputElement>(null);
  const currentConversationId = chat?.conversationId;

  const conversationsQuery = useInfiniteQuery({
    queryKey: [QueryKeys.fetchCopilotConversations, currentOrganization?._id, currentUser?._id],
    queryFn: ({ pageParam }) =>
      listConversations({ limit: PAGE_SIZE, orderBy: 'lastActivityAt', orderDirection: 'DESC', after: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    enabled: isAvailable,
    refetchOnWindowFocus: false,
    // The panel shows the failure with its own Retry.
    meta: { showError: false },
  });
  const { data, hasNextPage, isFetchingNextPage, fetchNextPage, refetch } = conversationsQuery;

  const items = useMemo(
    () =>
      toHistoryItems(
        (data?.pages ?? []).flatMap((page) => page.conversations),
        NOVU_COPILOT_AGENT_ID
      ),
    [data]
  );
  const now = new Date();
  const sections = getHistorySections(items, { query, scope, context: pageContext, now });
  const hasNoChats = items.length === 0 && !hasNextPage;
  // A page can hold only other agents' chats, so an empty one is not the end of the list.
  const isLookingForChats =
    items.length === 0 &&
    hasNextPage &&
    (data?.pages.length ?? 0) < MAX_LOOKUP_PAGES &&
    !conversationsQuery.isFetchNextPageError;

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  useEffect(() => {
    if (isLookingForChats && !isFetchingNextPage) void fetchNextPage();
  }, [isLookingForChats, isFetchingNextPage, fetchNextPage]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const isTyping =
      event.target instanceof Element && !!event.target.closest('input, textarea, [contenteditable="true"]');
    if (event.key !== '/' || isTyping) return;

    event.preventDefault();
    searchRef.current?.focus();
  };

  const onSelect = (item: CopilotHistoryItem) => {
    // The header shows the stored title until the chat's first prompt is loaded, which takes every older page.
    if (!readStoredCopilotTitle(item.identifier)) writeStoredCopilotTitle(item.identifier, item.title);
    resumeConversation(item.identifier);
  };

  const renderRow = (item: CopilotHistoryItem) => {
    const isCurrent = item.identifier === currentConversationId;

    return (
      <HistoryRow
        key={item.identifier}
        item={item}
        query={query}
        now={now}
        isCurrent={isCurrent}
        isWorking={isCurrent && isBusy}
        isDisabled={isBusy && !isCurrent}
        onSelect={onSelect}
      />
    );
  };

  const renderBody = () => {
    if (isConnecting) {
      return (
        <CenteredStatus>
          <CopilotThinkingIndicator label="Connecting…" />
        </CenteredStatus>
      );
    }

    if (!isAvailable) {
      return (
        <CenteredStatus>
          <span className="text-xs leading-4 text-text-soft">Copilot is off</span>
        </CenteredStatus>
      );
    }

    if (conversationsQuery.isPending || isLookingForChats) {
      return (
        <CenteredStatus>
          <CopilotThinkingIndicator label="Loading chats…" />
        </CenteredStatus>
      );
    }

    if (conversationsQuery.isError && items.length === 0) {
      return (
        <CenteredStatus>
          <span className="text-xs leading-4 text-text-soft">Couldn’t load your chats.</span>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs font-medium leading-4 text-text-strong transition-opacity hover:opacity-80"
          >
            Retry
          </button>
        </CenteredStatus>
      );
    }

    if (hasNoChats) {
      return (
        <div className="flex flex-1 flex-col justify-center overflow-y-auto px-2 pb-3">
          <CopilotEmptyHero title="No chats yet" body="Ask from any page. Your chats show up here." />
        </div>
      );
    }

    return (
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
        {sections.length === 0 && (
          <p className="px-2 pt-6 text-center text-xs leading-4 text-text-soft">
            {getEmptyListMessage(query.trim(), items.length > 0)}
          </p>
        )}
        {sections.map((section) => (
          <HistorySection key={section.key} label={section.label}>
            {section.items.map(renderRow)}
          </HistorySection>
        ))}
        {hasNextPage && (
          <button
            type="button"
            disabled={isFetchingNextPage}
            onClick={() => void fetchNextPage()}
            className="mx-auto mt-2 block text-xs leading-4 text-text-sub hover:text-text-strong hover:underline disabled:opacity-60"
          >
            {isFetchingNextPage ? 'Loading…' : 'Load older chats'}
          </button>
        )}
      </div>
    );
  };

  return (
    // Bubbled up from the rows and chips, so "/" jumps back to the search from anywhere in the list.
    // biome-ignore lint/a11y/noStaticElementInteractions: a keyboard shortcut, not an interaction with the container
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <div className="flex shrink-0 flex-col gap-2.5 px-3 pb-2 pt-3">
        <SearchField inputRef={searchRef} value={query} onChange={setQuery} />
        <ToggleGroup
          type="single"
          value={scope}
          onValueChange={(value) => {
            if (isHistoryScope(value)) setScope(value);
          }}
          aria-label="Show chats from"
          className="justify-start gap-1.5"
        >
          {SCOPES.map(({ value, label }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className="h-auto min-w-0 rounded-full border border-stroke-soft px-2 py-[3px] text-paragraph-xs text-text-sub hover:bg-bg-weak hover:text-text-strong data-[state=on]:border-bg-strong data-[state=on]:bg-bg-strong data-[state=on]:text-text-white data-[state=on]:hover:bg-bg-strong"
            >
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {renderBody()}
      <div className="flex shrink-0 items-center gap-2 border-t border-stroke-soft bg-bg-weak px-3 py-2.5">
        <Button
          variant="secondary"
          mode="outline"
          size="2xs"
          leadingIcon={RiAddLine}
          disabled={!isAvailable || !!chat?.isRunning}
          onClick={startNewConversation}
        >
          {conversationsQuery.isSuccess && hasNoChats ? 'Start a chat' : 'New chat'}
        </Button>
        <span className="ml-auto text-[11px] leading-4 text-text-soft">Chats are private to you</span>
      </div>
    </div>
  );
}
