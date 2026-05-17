import { CLAUDE_MCP_SERVERS, type ClaudeMcpServer } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import {
  type AgentMcpServerEnablement,
  type AgentResponse,
  disableAgentMcpServer,
  enableAgentMcpServer,
  getAgentMcpServersQueryKey,
  getAgentRuntimeConfigQueryKey,
  listAgentMcpServers,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { getMcpIcon } from '@/components/icons/mcp';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { Separator } from '@/components/primitives/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { ExternalLink } from '@/components/shared/external-link';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

type McpsSheetProps = {
  agent: AgentResponse;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  consoleUrl?: string;
};

function renderRowStatus({
  entry,
  enablement,
  isPending,
}: {
  entry: ClaudeMcpServer;
  enablement: AgentMcpServerEnablement | undefined;
  isPending: boolean;
}) {
  if (isPending) {
    return <span className="text-text-soft text-paragraph-xs shrink-0">Saving…</span>;
  }

  if (enablement?.status === 'error') {
    return <span className="text-error-base text-paragraph-xs shrink-0">Sync error</span>;
  }

  if (enablement?.enabled && entry.oauthMode === 'novu') {
    return <span className="text-text-soft text-paragraph-xs shrink-0">Subscribers authorize on first use</span>;
  }

  if (enablement?.enabled && entry.oauthMode === 'provider') {
    return <span className="text-text-soft text-paragraph-xs shrink-0">Provider-managed auth</span>;
  }

  return null;
}

export function McpsSheet({ agent, isOpen, onOpenChange, consoleUrl }: McpsSheetProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const enablementsQuery = useQuery({
    queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: ({ signal }) =>
      listAgentMcpServers(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, signal),
    enabled: isOpen && Boolean(currentEnvironment),
    staleTime: 0,
  });

  const enablementByMcpId = useMemo(() => {
    const map = new Map<string, AgentMcpServerEnablement>();
    for (const row of enablementsQuery.data ?? []) {
      map.set(row.mcpId, row);
    }

    return map;
  }, [enablementsQuery.data]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  const filteredMcps = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return CLAUDE_MCP_SERVERS;

    return CLAUDE_MCP_SERVERS.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.id.toLowerCase().includes(query)
    );
  }, [search]);

  const invalidateEnablements = () => {
    queryClient.invalidateQueries({
      queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
    });
    queryClient.invalidateQueries({
      queryKey: getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier),
    });
  };

  const enableMutation = useMutation({
    mutationFn: (mcpId: string) =>
      enableAgentMcpServer(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, {
        mcpId,
      }),
    onSuccess: () => {
      showSuccessToast('MCP enabled.');
      invalidateEnablements();
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not enable MCP.';
      showErrorToast(message, 'Update failed');
    },
    onSettled: () => setPendingId(null),
  });

  const disableMutation = useMutation({
    mutationFn: (mcpId: string) =>
      disableAgentMcpServer(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, mcpId),
    onSuccess: () => {
      showSuccessToast('MCP disabled.');
      invalidateEnablements();
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not disable MCP.';
      showErrorToast(message, 'Update failed');
    },
    onSettled: () => setPendingId(null),
  });

  const canEdit = !readOnly;
  const isMutating = enableMutation.isPending || disableMutation.isPending;

  const handleToggle = (entry: ClaudeMcpServer, checked: boolean) => {
    if (!canEdit || pendingId) return;
    setPendingId(entry.id);

    if (checked) {
      enableMutation.mutate(entry.id);
    } else {
      disableMutation.mutate(entry.id);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 p-0 sm:max-w-[370px]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="space-y-1 p-3 pr-10 text-left sm:text-left">
          <SheetTitle className="text-text-strong text-label-md font-medium">Configure external Claude MCPs</SheetTitle>
          <SheetDescription className="text-text-soft text-paragraph-xs leading-4">
            Configure external MCPs to let your agent communicate with the tools you use.{' '}
            <ExternalLink href="https://docs.claude.com/en/docs/agents-and-tools/mcp">Learn more</ExternalLink>
          </SheetDescription>
        </SheetHeader>

        <div className="px-3 pb-3">
          <Input
            leadingIcon={RiSearchLine}
            placeholder="Search MCPs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="xs"
            aria-label="Search MCP servers"
          />
        </div>

        <SheetMain className="flex-1 p-0">
          {filteredMcps.length === 0 ? (
            <div className="text-text-soft text-label-xs p-6 text-center">No MCP servers match your search.</div>
          ) : (
            <ul className="flex flex-col px-2 pb-2">
              {filteredMcps.map((entry) => {
                const enablement = enablementByMcpId.get(entry.id);
                const checked = Boolean(enablement?.enabled);
                const Icon = getMcpIcon(entry.id);
                const isPending = pendingId === entry.id && isMutating;

                return (
                  <li
                    key={entry.id}
                    className="hover:bg-bg-weak/60 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
                  >
                    <Switch
                      checked={checked}
                      onCheckedChange={(val) => handleToggle(entry, val)}
                      disabled={!canEdit || isMutating || enablementsQuery.isLoading}
                      aria-label={checked ? `Disable ${entry.name}` : `Enable ${entry.name}`}
                    />
                    {Icon ? <Icon className="size-5 shrink-0 -mr-2" aria-hidden /> : null}
                    <span className="text-text-strong text-label-sm min-w-0 flex-1 truncate font-medium">
                      {entry.name}
                    </span>
                    {renderRowStatus({ entry, enablement, isPending })}
                  </li>
                );
              })}
            </ul>
          )}
        </SheetMain>

        <Separator />

        <SheetFooter className="flex flex-row! items-center justify-between gap-2 px-3 py-2 sm:justify-between!">
          {consoleUrl ? <ExternalLink href={consoleUrl}>View in Claude</ExternalLink> : <span />}
          <Button
            type="button"
            variant="secondary"
            mode="filled"
            size="xs"
            disabled={isMutating}
            onClick={() => onOpenChange(false)}
          >
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
