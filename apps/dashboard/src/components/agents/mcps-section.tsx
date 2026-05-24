import { MCP_SERVERS, type McpServer } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiAddLine, RiArrowRightUpLine } from 'react-icons/ri';
import {
  type AgentMcpServerEnablement,
  type AgentResponse,
  disableAgentMcpServer,
  getAgentMcpServersQueryKey,
  getAgentRuntimeConfig,
  getAgentRuntimeConfigQueryKey,
  listAgentMcpServers,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { getMcpIcon } from '@/components/icons/mcp';
import { Button } from '@/components/primitives/button';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { McpsSheet } from './mcps-sheet';

type McpsSectionProps = {
  agent: AgentResponse;
};

const MCP_CATALOG_BY_ID: Map<string, McpServer> = new Map(MCP_SERVERS.map((server) => [server.id, server]));

function SectionShell({
  isManagedExternally,
  consoleUrl,
  children,
  title,
}: {
  title: string;
  isManagedExternally: boolean;
  consoleUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg-weak flex flex-col rounded-[10px] p-1">
      <div className="flex items-center justify-between px-2 pt-1 pb-1.5">
        <span className="text-text-soft font-code text-[11px] font-medium uppercase leading-4 tracking-wider">
          {title}
        </span>
        {isManagedExternally ? (
          <div className="flex items-center gap-2">
            <span className="text-text-soft text-label-xs font-normal">Managed externally</span>
            <span className="text-text-soft text-label-xs">·</span>
            {consoleUrl ? (
              <a
                href={consoleUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="text-text-sub hover:text-text-strong inline-flex items-center gap-0.5 rounded-lg p-0 text-label-xs font-medium transition-colors"
              >
                View in Claude
                <RiArrowRightUpLine className="size-4" />
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="bg-bg-white flex flex-col overflow-hidden rounded-md shadow-[0px_0px_0px_1px_rgba(25,28,33,0.04),0px_1px_2px_0px_rgba(25,28,33,0.06),0px_0px_2px_0px_rgba(0,0,0,0.08)]">
        {children}
      </div>
    </div>
  );
}

export function McpsSection({ agent }: McpsSectionProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const configQuery = useQuery({
    queryKey: getAgentRuntimeConfigQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      getAgentRuntimeConfig(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    enabled: Boolean(currentEnvironment && agent.identifier && agent.runtime === 'managed'),
  });

  const mcpServersQuery = useQuery({
    queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
    queryFn: () =>
      listAgentMcpServers(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier),
    enabled: Boolean(currentEnvironment && agent.identifier && agent.runtime === 'managed'),
  });

  const disableMcp = useMutation({
    mutationFn: (mcpId: string) =>
      disableAgentMcpServer(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, mcpId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
      });
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not disable MCP server.';
      showErrorToast(message, 'Update failed');
    },
  });

  const enabledServers = useMemo<AgentMcpServerEnablement[]>(() => mcpServersQuery.data ?? [], [mcpServersQuery.data]);

  if (agent.runtime !== 'managed') {
    return null;
  }

  const config = configQuery.data;

  if (config?.capabilities && config.capabilities.mcpServers === false) {
    return null;
  }

  const isMutating = disableMcp.isPending;
  const canEdit = !readOnly;
  const consoleUrl = agent.managedRuntime?.consoleUrl;
  const isLoading = mcpServersQuery.isLoading;
  const isError = mcpServersQuery.isError;

  return (
    <>
      <SectionShell title="MCPs" isManagedExternally consoleUrl={consoleUrl}>
        {isLoading ? (
          <div className="flex flex-col gap-2 p-3">
            {[0, 1].map((key) => (
              <div key={key} className="flex items-center gap-2">
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-text-soft text-label-xs p-3">Could not load MCP servers. Try again later.</div>
        ) : enabledServers.length === 0 ? (
          <div className="text-text-soft text-label-xs p-3 h-11">No MCP servers connected yet.</div>
        ) : (
          <ul className="flex flex-col">
            {enabledServers.map((enablement) => {
              const catalog = MCP_CATALOG_BY_ID.get(enablement.mcpId);
              const displayName = catalog?.name ?? enablement.mcpId;
              const Icon = getMcpIcon(catalog?.id ?? enablement.mcpId);

              return (
                <li key={enablement.id} className="flex items-center gap-3 p-3 not-last:border-b border-stroke-soft/60">
                  <Switch
                    checked
                    disabled={!canEdit || isMutating}
                    onCheckedChange={() => disableMcp.mutate(enablement.mcpId)}
                    aria-label={`Disconnect ${displayName}`}
                  />
                  {Icon ? <Icon className="size-5 shrink-0 -mr-2" aria-hidden /> : null}
                  <span className="text-text-sub text-label-sm min-w-0 flex-1 truncate font-medium">{displayName}</span>
                </li>
              );
            })}
          </ul>
        )}

        {canEdit ? (
          <Button
            type="button"
            variant="secondary"
            mode="outline"
            size="xs"
            trailingIcon={RiAddLine}
            isLoading={isMutating}
            disabled={isMutating}
            onClick={() => setIsSheetOpen(true)}
            className="border-stroke-soft w-[calc(100%-16px)] justify-center m-2"
          >
            Add MCPs
          </Button>
        ) : null}
      </SectionShell>

      <McpsSheet
        agent={agent}
        isOpen={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        enabledServers={enabledServers}
        consoleUrl={consoleUrl}
      />
    </>
  );
}
