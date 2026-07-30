import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiCheckLine, RiCloseLine, RiExpandUpDownLine, RiLoader4Line, RiRobot2Line, RiSearchLine } from 'react-icons/ri';
import {
  type AgentResponse,
  getAgent,
  getAgentDetailQueryKey,
  getAgentsInfiniteListQueryKey,
  listAgents,
} from '@/api/agents';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useHasPermission } from '@/hooks/use-has-permission';
import { cn } from '@/utils/ui';

const PAGE_SIZE = 20;

type WorkflowAgentSelectProps = {
  value: string | null | undefined;
  onChange: (agentIdentifier: string | null) => void;
  disabled?: boolean;
  className?: string;
};

export function WorkflowAgentSelect({ value, onChange, disabled, className }: WorkflowAgentSelectProps) {
  const { currentEnvironment } = useEnvironment();
  const has = useHasPermission();
  const canReadAgents = has({ permission: PermissionsEnum.AGENT_READ });
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollId = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const listQuery = useInfiniteQuery({
    queryKey: getAgentsInfiniteListQueryKey(currentEnvironment?._id, {
      limit: PAGE_SIZE,
      identifier: debouncedSearch,
    }),
    queryFn: ({ pageParam, signal }) =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: PAGE_SIZE,
        after: pageParam,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
        identifier: debouncedSearch || undefined,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.next ?? undefined,
    enabled: Boolean(currentEnvironment) && canReadAgents && open,
    placeholderData: keepPreviousData,
  });

  const selectedAgentQuery = useQuery({
    queryKey: getAgentDetailQueryKey(currentEnvironment?._id, value ?? undefined),
    queryFn: () => getAgent(requireEnvironment(currentEnvironment, 'No environment selected'), value ?? ''),
    enabled: Boolean(currentEnvironment) && canReadAgents && Boolean(value),
    retry: false,
  });

  const selectedAgent = selectedAgentQuery.data;
  const isUnavailable = Boolean(value) && selectedAgentQuery.isError;
  const displayLabel = selectedAgent?.name ?? (value ? (isUnavailable ? 'Agent unavailable' : value) : 'Select agent');

  const handleSelect = useCallback(
    (identifier: string | null) => {
      onChange(identifier);
      setOpen(false);
      setSearch('');
    },
    [onChange]
  );

  const handleSearchChange = useCallback((nextSearch: string) => {
    setSearch(nextSearch);

    if (scrollId.current) {
      clearTimeout(scrollId.current);
    }

    /**
     * Scroll to top bug workaround: https://github.com/pacocoursey/cmdk/issues/233#issuecomment-2015998940
     */
    scrollId.current = setTimeout(() => {
      listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, 0);
  }, []);

  const agents = useMemo(() => {
    const seenIds = new Set<string>();

    return (listQuery.data?.pages ?? []).reduce<AgentResponse[]>((all, page) => {
      for (const agent of page.data) {
        if (!seenIds.has(agent._id)) {
          seenIds.add(agent._id);
          all.push(agent);
        }
      }

      return all;
    }, []);
  }, [listQuery.data]);

  if (!canReadAgents) {
    return (
      <div
        className={cn(
          'bg-bg-weak border-stroke-soft text-text-sub flex h-7 w-full items-center gap-1.5 rounded-md border px-2 text-label-xs',
          className
        )}
      >
        <RiRobot2Line className="text-text-soft size-4 shrink-0" />
        <span className="min-w-0 flex-1 truncate">{value ? displayLabel : 'Select agent'}</span>
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'bg-bg-white border-stroke-soft shadow-xs flex h-7 w-full items-center gap-1.5 overflow-hidden rounded-md border px-2 text-left text-label-xs transition-colors',
              'hover:border-stroke-soft focus-visible:ring-stroke-soft/50 focus-visible:ring-[3px] focus-visible:outline-hidden',
              disabled && 'cursor-not-allowed opacity-50',
              isUnavailable && 'text-warning-base',
              value && !disabled && 'pr-7'
            )}
          >
            <RiRobot2Line className="text-text-soft size-4 shrink-0" />
            <span className="text-text-strong min-w-0 flex-1 truncate font-medium">
              {value ? displayLabel : <span className="text-text-soft">Select agent</span>}
            </span>
            {!value || disabled ? <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" /> : null}
          </button>
        </PopoverTrigger>
        <PopoverContent
          portal={false}
          className="w-[var(--radix-popover-trigger-width)] rounded-lg p-0"
          side="bottom"
          align="start"
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search agents..."
              value={search}
              onValueChange={handleSearchChange}
              inputRootClassName="rounded-b-none before:ring-0 before:border-b before:border-gray-200 has-[input:focus]:shadow-none focus-within:shadow-none"
              inlineLeadingNode={<RiSearchLine className="size-4 text-neutral-400" />}
              autoComplete="off"
            />
            <CommandList ref={listRef}>
              {listQuery.isLoading ? (
                <div className="text-text-soft flex items-center justify-center gap-2 py-6 text-label-xs">
                  <RiLoader4Line className="size-4 animate-spin" />
                  Loading agents…
                </div>
              ) : (
                <>
                  <CommandEmpty>No agents found.</CommandEmpty>
                  <CommandGroup className="rounded-md p-2">
                    {agents.map((agent) => (
                      <CommandItem
                        key={agent._id}
                        value={agent.identifier}
                        onSelect={() => handleSelect(agent.identifier)}
                        className={cn('cursor-pointer gap-1.5', {
                          'bg-accent': value === agent.identifier,
                        })}
                      >
                        <RiRobot2Line className="text-text-soft size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                        {!agent.active ? (
                          <span className="text-text-soft shrink-0 text-[10px] font-medium uppercase">Paused</span>
                        ) : null}
                        <RiCheckLine
                          className={cn('ml-auto size-4 shrink-0', value === agent.identifier ? 'opacity-100' : 'opacity-0')}
                        />
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {listQuery.hasNextPage ? (
                    <div className="border-stroke-weak border-t p-1">
                      <button
                        type="button"
                        className="text-text-sub hover:bg-bg-weak flex w-full items-center justify-center rounded px-2 py-1.5 text-label-xs font-medium disabled:opacity-50"
                        disabled={listQuery.isFetchingNextPage}
                        onClick={() => listQuery.fetchNextPage()}
                      >
                        {listQuery.isFetchingNextPage ? 'Loading…' : 'Load more'}
                      </button>
                    </div>
                  ) : null}
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && !disabled ? (
        <button
          type="button"
          aria-label="Clear agent"
          className="text-text-soft hover:text-text-sub absolute top-1/2 right-2 -translate-y-1/2"
          onClick={() => handleSelect(null)}
        >
          <RiCloseLine className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
