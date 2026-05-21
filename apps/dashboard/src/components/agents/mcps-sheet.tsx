import { MCP_SERVERS, McpConnectionAuthModeEnum, type McpServer } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import {
  type AgentMcpServerEnablement,
  type AgentResponse,
  disableAgentMcpServer,
  enableAgentMcpServer,
  getAgentMcpServersQueryKey,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { getMcpIcon } from '@/components/icons/mcp';
import { Badge } from '@/components/primitives/badge';
import { Input } from '@/components/primitives/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetMain,
  SheetTitle,
} from '@/components/primitives/sheet';
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ExternalLink } from '@/components/shared/external-link';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';

type McpsSheetProps = {
  agent: AgentResponse;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enabledServers: AgentMcpServerEnablement[];
  consoleUrl?: string;
};

/**
 * Gate the picker on auth modes the backend can actually complete, not just on
 * `oauth` presence. The `novu-app` / `user-app` modes are typed in the catalog
 * but the OAuth start/callback use cases still return `NotImplementedException`
 * for them, so surfacing those rows as toggle-able would only fail at mutation
 * time. Keep this set in lock-step with the modes wired in
 * `generate-mcp-oauth-url.usecase.ts` / `mcp-oauth-callback.usecase.ts`.
 */
const SUPPORTED_AUTH_MODES = new Set<McpConnectionAuthModeEnum>([McpConnectionAuthModeEnum.Dcr]);

function isMcpSupported(entry: McpServer): boolean {
  return entry.oauth !== undefined && SUPPORTED_AUTH_MODES.has(entry.oauth.mode);
}

/**
 * Sort supported entries first, preserving the catalog's intrinsic ordering
 * (popular-first) within each group so the toggle-able rows surface at the
 * top of every search result.
 */
function sortSupportedFirst(entries: McpServer[]): McpServer[] {
  const supported: McpServer[] = [];
  const unsupported: McpServer[] = [];

  for (const entry of entries) {
    if (isMcpSupported(entry)) {
      supported.push(entry);
    } else {
      unsupported.push(entry);
    }
  }

  return [...supported, ...unsupported];
}

export function McpsSheet({ agent, isOpen, onOpenChange, enabledServers, consoleUrl }: McpsSheetProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  // Single-row optimistic state. Holds the intended next checked value for the
  // row currently being toggled so the Switch flips instantly instead of
  // springing back to `enabledIds` while the refetch is in flight. Cleared
  // only after the refetched ground truth lands (or on error / sheet close)
  // to avoid a flicker between mutation success and refetch completion.
  // Safe as a single field because the UI disables every row while a mutation
  // is pending, so there can never be two in-flight toggles at once.
  const [pendingChange, setPendingChange] = useState<{ id: string; nextChecked: boolean } | null>(null);

  const enabledIds = useMemo(() => new Set(enabledServers.map((server) => server.mcpId)), [enabledServers]);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setPendingChange(null);
    }
  }, [isOpen]);

  const filteredMcps = useMemo(() => {
    const query = search.trim().toLowerCase();
    const matched = query
      ? MCP_SERVERS.filter(
          (entry) =>
            entry.name.toLowerCase().includes(query) ||
            entry.description.toLowerCase().includes(query) ||
            entry.id.toLowerCase().includes(query)
        )
      : MCP_SERVERS;

    return sortSupportedFirst(matched);
  }, [search]);

  const invalidateMcpsQuery = () =>
    queryClient.invalidateQueries({
      queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
    });

  const enableMutation = useMutation({
    mutationFn: (mcpId: string) =>
      enableAgentMcpServer(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, mcpId),
    onSuccess: async () => {
      // Await the refetch so the cache reflects the new enablement before we
      // drop the optimistic flag — otherwise the Switch briefly snaps back.
      await invalidateMcpsQuery();
      setPendingChange(null);
    },
    onError: (err: Error) => {
      setPendingChange(null);
      const message = err instanceof NovuApiError ? err.message : 'Could not enable MCP server.';
      showErrorToast(message, 'Update failed');
    },
  });

  const disableMutation = useMutation({
    mutationFn: (mcpId: string) =>
      disableAgentMcpServer(requireEnvironment(currentEnvironment, 'No environment selected'), agent.identifier, mcpId),
    onSuccess: async () => {
      await invalidateMcpsQuery();
      setPendingChange(null);
    },
    onError: (err: Error) => {
      setPendingChange(null);
      const message = err instanceof NovuApiError ? err.message : 'Could not disable MCP server.';
      showErrorToast(message, 'Update failed');
    },
  });

  const canEdit = !readOnly;
  const isMutating = enableMutation.isPending || disableMutation.isPending;

  const handleToggle = (entry: McpServer, nextChecked: boolean) => {
    if (!isMcpSupported(entry)) {
      return;
    }

    setPendingChange({ id: entry.id, nextChecked });

    if (nextChecked) {
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
                const supported = isMcpSupported(entry);
                const isPending = pendingChange?.id === entry.id;
                // Reflect the user's intent immediately when a mutation is in
                // flight for this row; otherwise mirror the server truth.
                const checked = isPending ? pendingChange.nextChecked : enabledIds.has(entry.id);
                const Icon = getMcpIcon(entry.id);
                const rowDisabled = !canEdit || isMutating || !supported;

                const row = (
                  <li
                    key={entry.id}
                    className="hover:bg-bg-weak/60 flex items-center gap-3 rounded-md px-2 py-2 transition-colors"
                  >
                    <Switch
                      checked={checked}
                      onCheckedChange={(val) => handleToggle(entry, val)}
                      disabled={rowDisabled}
                      aria-label={checked ? `Disable ${entry.name}` : `Enable ${entry.name}`}
                    />
                    {Icon ? <Icon className="size-5 shrink-0 -mr-2" aria-hidden /> : null}
                    <span
                      className={
                        supported
                          ? 'text-text-strong text-label-sm min-w-0 flex-1 truncate font-medium'
                          : 'text-text-soft text-label-sm min-w-0 flex-1 truncate font-medium'
                      }
                    >
                      {entry.name}
                    </span>
                    {!supported ? (
                      <Badge size="sm" variant="lighter" color="gray">
                        Coming soon
                      </Badge>
                    ) : null}
                    {isPending ? <span className="text-text-soft text-label-xs">Updating…</span> : null}
                  </li>
                );

                if (supported) {
                  return row;
                }

                return (
                  <Tooltip key={entry.id}>
                    <TooltipTrigger asChild>{row}</TooltipTrigger>
                    <TooltipContent side="left">Coming soon — OAuth wiring not yet available.</TooltipContent>
                  </Tooltip>
                );
              })}
            </ul>
          )}
        </SheetMain>

        <SheetFooter className="flex flex-row! items-center justify-between gap-2 px-3 py-2 sm:justify-between!">
          {consoleUrl ? <ExternalLink href={consoleUrl}>View in Claude</ExternalLink> : <span />}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
