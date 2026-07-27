import { DirectionEnum, PermissionsEnum } from '@novu/shared';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiCloseLine, RiExpandUpDownLine, RiLoader4Line, RiRobot2Line } from 'react-icons/ri';
import { type AgentResponse, getAgent, getAgentDetailQueryKey, getAgentsListQueryKey, listAgents } from '@/api/agents';
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
  const [after, setAfter] = useState<string | undefined>();
  const [accumulatedAgents, setAccumulatedAgents] = useState<AgentResponse[]>([]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setAfter(undefined);
      setAccumulatedAgents([]);
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const listQuery = useQuery({
    queryKey: getAgentsListQueryKey(currentEnvironment?._id, {
      after,
      before: undefined,
      limit: PAGE_SIZE,
      identifier: debouncedSearch,
    }),
    queryFn: () =>
      listAgents({
        environment: requireEnvironment(currentEnvironment, 'No environment selected'),
        limit: PAGE_SIZE,
        after,
        orderBy: 'updatedAt',
        orderDirection: DirectionEnum.DESC,
        identifier: debouncedSearch || undefined,
      }),
    enabled: Boolean(currentEnvironment) && canReadAgents && open,
    placeholderData: keepPreviousData,
  });

  useEffect(() => {
    if (!listQuery.data) {
      return;
    }

    setAccumulatedAgents((previous) => {
      if (!after) {
        return listQuery.data.data;
      }

      const existingIds = new Set(previous.map((agent) => agent._id));
      const nextPage = listQuery.data.data.filter((agent) => !existingIds.has(agent._id));

      return [...previous, ...nextPage];
    });
  }, [after, listQuery.data]);

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

  const nextCursor = listQuery.data?.next ?? null;
  const isLoading = listQuery.isPending && accumulatedAgents.length === 0;
  const agents = useMemo(() => accumulatedAgents, [accumulatedAgents]);

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
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput placeholder="Search agents..." value={search} onValueChange={setSearch} />
            <CommandList>
              {isLoading ? (
                <div className="text-text-soft flex items-center justify-center gap-2 py-6 text-label-xs">
                  <RiLoader4Line className="size-4 animate-spin" />
                  Loading agents…
                </div>
              ) : (
                <>
                  <CommandEmpty>No agents found.</CommandEmpty>
                  <CommandGroup>
                    {agents.map((agent) => (
                      <CommandItem
                        key={agent._id}
                        value={agent.identifier}
                        onSelect={() => handleSelect(agent.identifier)}
                        className="gap-1.5"
                      >
                        <RiRobot2Line className="text-text-soft size-4 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{agent.name}</span>
                        {!agent.active ? (
                          <span className="text-text-soft shrink-0 text-[10px] font-medium uppercase">Paused</span>
                        ) : null}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                  {nextCursor ? (
                    <div className="border-stroke-weak border-t p-1">
                      <button
                        type="button"
                        className="text-text-sub hover:bg-bg-weak flex w-full items-center justify-center rounded px-2 py-1.5 text-label-xs font-medium disabled:opacity-50"
                        disabled={listQuery.isFetching}
                        onClick={() => setAfter(nextCursor)}
                      >
                        {listQuery.isFetching ? 'Loading…' : 'Load more'}
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
