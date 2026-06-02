import { FeatureFlagsKeysEnum, MCP_SERVERS, McpConnectionAuthModeEnum, type McpServer } from '@novu/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiAddLine, RiArrowRightUpLine, RiCloseLine, RiLoader4Line } from 'react-icons/ri';
import {
  type AgentMcpServerEnablement,
  type AgentResponse,
  disableAgentMcpServer,
  ensureProviderManagedVault,
  getAgentMcpServersQueryKey,
  getAgentRuntimeConfig,
  getAgentRuntimeConfigQueryKey,
  listAgentMcpServers,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { McpIcon } from '@/components/agents/mcp-icon';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
import { Skeleton } from '@/components/primitives/skeleton';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { cn } from '@/utils/ui';
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
  // Mirrors the server-side IS_MCP_PROVIDER_MANAGED_ENABLED gate; when off
  // the link-out badge is rendered as a passive read-only badge so users
  // can't trip a 403 toast while the rollout flag is still ramping.
  const providerManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MCP_PROVIDER_MANAGED_ENABLED);

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

  // Track the row being removed so we can disable just that row's button while
  // the mutation is in flight, instead of disabling every row.
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);

  // Mirrors `pendingRemovalId` for the "Open in Claude" re-link mutation
  // (re-uses the idempotent ensure-vault endpoint to re-derive the
  // provider deep link without persisting it on the client).
  const [pendingVaultId, setPendingVaultId] = useState<string | null>(null);

  const disableMcp = useMutation({
    mutationFn: (mcpId: string) =>
      disableAgentMcpServer(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, mcpId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
      });
      setPendingRemovalId(null);
    },
    onError: (err: Error) => {
      setPendingRemovalId(null);
      const message = err instanceof NovuApiError ? err.message : 'Could not disable MCP server.';
      showErrorToast(message, 'Update failed');
    },
  });

  // Re-open the provider vault for an already-enabled provider-managed row.
  // The dashboard never persists the vault URL on the client (workspace id
  // is derived server-side from integration credentials), so each open hits
  // the idempotent ensure-vault endpoint to re-derive the link before
  // popping the new tab.
  const openVaultMutation = useMutation({
    mutationFn: (mcpId: string) =>
      ensureProviderManagedVault(
        requireEnvironment(currentEnvironment, 'No environment selected'),
        agent.identifier,
        mcpId
      ),
    onSuccess: (response) => {
      window.open(response.vaultUrl, '_blank', 'noopener,noreferrer');
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not open vault in Claude.';
      showErrorToast(message, 'Open in Claude failed');
    },
    onSettled: () => {
      setPendingVaultId(null);
    },
  });

  const handleRemove = (mcpId: string) => {
    setPendingRemovalId(mcpId);
    disableMcp.mutate(mcpId);
  };

  const handleOpenVault = (mcpId: string) => {
    if (pendingVaultId) return;
    setPendingVaultId(mcpId);
    openVaultMutation.mutate(mcpId);
  };

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
                <Skeleton className="size-5 rounded-md" />
                <Skeleton className="h-4 w-24 flex-1" />
                <Skeleton className="size-5 rounded-md" />
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
              const isProviderManaged = enablement.defaultAuthMode === McpConnectionAuthModeEnum.ProviderManaged;
              const isRowPending = pendingRemovalId === enablement.mcpId;
              const isRowVaultOpening = pendingVaultId === enablement.mcpId;

              return (
                <li
                  key={enablement.id}
                  className={cn(
                    'border-stroke-soft/60 flex items-center gap-2 p-3 not-last:border-b transition-opacity',
                    (isRowPending || isRowVaultOpening) && 'opacity-60'
                  )}
                  aria-busy={isRowPending || isRowVaultOpening || undefined}
                >
                  <McpIcon mcpId={catalog?.id ?? enablement.mcpId} />
                  <span className="text-text-sub text-label-sm min-w-0 flex-1 truncate font-medium">{displayName}</span>
                  {isProviderManaged ? (
                    <div className="flex shrink-0 items-center gap-0.5">
                      <Button
                        type="button"
                        variant="secondary"
                        mode="ghost"
                        size="xs"
                        onClick={() => handleOpenVault(enablement.mcpId)}
                        disabled={
                          !providerManagedEnabled ||
                          isRowVaultOpening ||
                          (Boolean(pendingVaultId) && !isRowVaultOpening)
                        }
                        aria-label={`Open ${displayName} in Claude vault`}
                        aria-busy={isRowVaultOpening || undefined}
                        className="h-5 min-w-[8.5rem] shrink-0 justify-center gap-1 px-2 disabled:bg-transparent"
                      >
                        {isRowVaultOpening ? (
                          <RiLoader4Line className="text-text-sub size-4 shrink-0 animate-spin" aria-hidden />
                        ) : (
                          <>
                            <span>Added from Claude</span>
                            {providerManagedEnabled ? (
                              <RiArrowRightUpLine className="size-4 shrink-0" aria-hidden />
                            ) : null}
                          </>
                        )}
                      </Button>
                      {canEdit ? (
                        <CompactButton
                          variant="ghost"
                          size="md"
                          icon={RiCloseLine}
                          onClick={() => handleRemove(enablement.mcpId)}
                          disabled={isRowPending}
                          aria-label={`Remove ${displayName}`}
                          className="-mr-1"
                        >
                          <span className="sr-only">Remove {displayName}</span>
                        </CompactButton>
                      ) : null}
                    </div>
                  ) : canEdit ? (
                    <CompactButton
                      variant="ghost"
                      size="md"
                      icon={RiCloseLine}
                      onClick={() => handleRemove(enablement.mcpId)}
                      disabled={isRowPending}
                      aria-label={`Remove ${displayName}`}
                      className="-mr-1"
                    >
                      <span className="sr-only">Remove {displayName}</span>
                    </CompactButton>
                  ) : null}
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
