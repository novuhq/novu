import { MCP_SERVERS, McpConnectionAuthModeEnum, type McpServer } from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiCloseLine, RiSearchLine } from 'react-icons/ri';
import {
  type AgentMcpServerEnablement,
  type AgentResponse,
  getAgentMcpServersQueryKey,
  type SetAgentMcpServersFailure,
  setAgentMcpServers,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { getMcpIcon } from '@/components/icons/mcp';
import { Badge } from '@/components/primitives/badge';
import { Button } from '@/components/primitives/button';
import { CompactButton } from '@/components/primitives/button-compact';
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
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { ExternalLink } from '@/components/shared/external-link';
import { UnsavedChangesAlertDialog } from '@/components/unsaved-changes-alert-dialog';
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
 * `oauth` presence. Keep this set in lock-step with the modes wired in
 * `generate-mcp-oauth-url.usecase.ts` / `mcp-oauth-callback.usecase.ts`.
 *
 * `novu-app` is included here but enable / authorize calls are additionally
 * gated server-side by `IS_MCP_NOVU_APP_ENABLED`, so an org without the flag
 * will see a 403 with `error: 'mcp_novu_app_disabled'` on Save (surfaced
 * via the existing `showErrorToast`). `user-app` is still typed-only.
 */
const SUPPORTED_AUTH_MODES = new Set<McpConnectionAuthModeEnum>([
  McpConnectionAuthModeEnum.Dcr,
  McpConnectionAuthModeEnum.NovuApp,
]);

/**
 * Special-case catalog entries whose connection is managed entirely inside
 * Claude (not OAuth via Novu). These get a "Managed in Claude" badge instead
 * of "Coming soon", and the Add button stays disabled.
 */
const MANAGED_IN_CLAUDE_IDS = new Set<string>(['slack']);

type McpBadgeKind = 'oauth' | 'managed-in-claude' | 'coming-soon';

function getMcpBadgeKind(entry: McpServer): McpBadgeKind {
  if (entry.oauth && SUPPORTED_AUTH_MODES.has(entry.oauth.mode)) {
    return 'oauth';
  }

  if (MANAGED_IN_CLAUDE_IDS.has(entry.id)) {
    return 'managed-in-claude';
  }

  return 'coming-soon';
}

function isMcpSupported(entry: McpServer): boolean {
  return getMcpBadgeKind(entry) === 'oauth';
}

function getBadgeLabel(kind: McpBadgeKind): string {
  switch (kind) {
    case 'oauth':
      return 'OAuth';
    case 'managed-in-claude':
      return 'Managed in Claude';
    case 'coming-soon':
      return 'Coming soon';
    default: {
      const _exhaustive: never = kind;

      return _exhaustive;
    }
  }
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

function formatPartialFailureMessage(failures: SetAgentMcpServersFailure[]): string {
  const labels = failures
    .map((f) => f.mcpId)
    .slice(0, 3)
    .join(', ');
  const suffix = failures.length > 3 ? `, +${failures.length - 3} more` : '';

  return `Could not update: ${labels}${suffix}.`;
}

export function McpsSheet({ agent, isOpen, onOpenChange, enabledServers, consoleUrl }: McpsSheetProps) {
  const { currentEnvironment, readOnly } = useEnvironment();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  // Staged enablement set. Mirrors `enabledServers` whenever the sheet opens
  // and is then driven entirely by the in-sheet Add / Remove actions until
  // the user clicks "Save changes" (which commits the diff against the
  // initial snapshot) or discards via the Unsaved changes dialog.
  const [stagedIds, setStagedIds] = useState<Set<string>>(() => new Set(enabledServers.map((s) => s.mcpId)));
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const initialEnabledIds = useMemo(() => new Set(enabledServers.map((server) => server.mcpId)), [enabledServers]);

  // Re-seed staged state only on the open transition. Re-syncing on every
  // `enabledServers` change would clobber the user's in-progress edits the
  // moment a background refetch lands.
  const enabledServersRef = useRef(enabledServers);
  enabledServersRef.current = enabledServers;
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setSearch('');
      setStagedIds(new Set(enabledServersRef.current.map((s) => s.mcpId)));
      setShowUnsavedDialog(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen]);

  const hasUnsavedChanges = useMemo(() => {
    if (stagedIds.size !== initialEnabledIds.size) return true;

    for (const id of stagedIds) {
      if (!initialEnabledIds.has(id)) return true;
    }

    return false;
  }, [stagedIds, initialEnabledIds]);

  const filteredMcps = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return MCP_SERVERS;

    return MCP_SERVERS.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.id.toLowerCase().includes(query)
    );
  }, [search]);

  const { enabledList, availableList } = useMemo(() => {
    const enabled: McpServer[] = [];
    const available: McpServer[] = [];

    for (const entry of filteredMcps) {
      if (stagedIds.has(entry.id)) {
        enabled.push(entry);
      } else {
        available.push(entry);
      }
    }

    return { enabledList: enabled, availableList: sortSupportedFirst(available) };
  }, [filteredMcps, stagedIds]);

  const invalidateMcpsQuery = () =>
    queryClient.invalidateQueries({
      queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
    });

  const saveMutation = useMutation({
    mutationFn: () => {
      const env = requireEnvironment(currentEnvironment, 'No environment selected');

      return setAgentMcpServers(env, agent.identifier, [...stagedIds]);
    },
    onSuccess: async (response) => {
      await invalidateMcpsQuery();

      if (response.failed.length === 0) {
        onOpenChange(false);

        return;
      }

      // Partial failure — keep the sheet open so the user sees what didn't
      // take, and re-seed the staged set from the new server truth so
      // successful changes stick and the dirty diff resets.
      setStagedIds(new Set(response.data.map((row) => row.mcpId)));
      showErrorToast(formatPartialFailureMessage(response.failed), 'Some MCPs could not be updated');
    },
    onError: async (err: Error) => {
      // Re-sync so any partial successes are reflected and the user sees
      // an accurate picture before retrying.
      await invalidateMcpsQuery();
      const message = err instanceof NovuApiError ? err.message : 'Could not update MCP servers.';
      showErrorToast(message, 'Save failed');
    },
  });

  const canEdit = !readOnly;
  const isSaving = saveMutation.isPending;

  const handleAdd = (entry: McpServer) => {
    if (!isMcpSupported(entry)) return;

    setStagedIds((prev) => {
      if (prev.has(entry.id)) return prev;

      const next = new Set(prev);
      next.add(entry.id);

      return next;
    });
  };

  const handleRemove = (entry: McpServer) => {
    setStagedIds((prev) => {
      if (!prev.has(entry.id)) return prev;

      const next = new Set(prev);
      next.delete(entry.id);

      return next;
    });
  };

  const handleSave = () => {
    if (!hasUnsavedChanges || isSaving) return;
    saveMutation.mutate();
  };

  const closeSheet = useCallback(() => {
    setShowUnsavedDialog(false);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleCloseAttempt = useCallback(
    (event?: Event | KeyboardEvent) => {
      if (isSaving) {
        event?.preventDefault();

        return;
      }

      if (hasUnsavedChanges) {
        event?.preventDefault();
        setShowUnsavedDialog(true);

        return;
      }
    },
    [hasUnsavedChanges, isSaving]
  );

  const handleOpenChange = (open: boolean) => {
    if (open) {
      onOpenChange(true);

      return;
    }

    if (isSaving) return;

    if (hasUnsavedChanges) {
      setShowUnsavedDialog(true);

      return;
    }

    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleOpenChange}>
        <SheetContent
          className="flex w-full flex-col gap-0 p-0 sm:max-w-[400px]"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={handleCloseAttempt}
          onEscapeKeyDown={handleCloseAttempt}
        >
          <SheetHeader className="bg-bg-weak border-stroke-soft space-y-1 border-b p-3 pr-10 text-left sm:text-left">
            <SheetTitle className="text-text-strong text-label-md font-medium">
              Configure external Claude MCPs
            </SheetTitle>
            <SheetDescription className="text-text-soft text-paragraph-xs leading-4">
              Configure external MCPs to let your agent communicate with the tools you use.{' '}
              <ExternalLink href="https://docs.claude.com/en/docs/agents-and-tools/mcp">Learn more</ExternalLink>
            </SheetDescription>
          </SheetHeader>

          <div className="bg-bg-white p-3">
            <Input
              leadingIcon={RiSearchLine}
              placeholder="Search MCPs..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              size="xs"
              aria-label="Search MCP servers"
            />
          </div>

          <SheetMain className="bg-bg-white flex-1 p-0">
            {enabledList.length === 0 && availableList.length === 0 ? (
              <div className="text-text-soft text-label-xs p-6 text-center">No MCP servers match your search.</div>
            ) : (
              <div className="flex flex-col pb-3">
                {enabledList.length > 0 ? (
                  <McpSection title="Enabled MCPs">
                    {enabledList.map((entry) => (
                      <McpRow
                        key={`enabled-${entry.id}`}
                        entry={entry}
                        action="remove"
                        disabled={!canEdit || isSaving}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                      />
                    ))}
                  </McpSection>
                ) : null}

                {availableList.length > 0 ? (
                  <McpSection title="Available MCPs" withTopSpacing={enabledList.length > 0}>
                    {availableList.map((entry) => (
                      <McpRow
                        key={`available-${entry.id}`}
                        entry={entry}
                        action="add"
                        disabled={!canEdit || isSaving}
                        onAdd={handleAdd}
                        onRemove={handleRemove}
                      />
                    ))}
                  </McpSection>
                ) : null}
              </div>
            )}
          </SheetMain>

          <SheetFooter className="bg-bg-weak border-stroke-soft flex flex-row! items-center justify-between gap-4 border-t p-3 sm:justify-between!">
            {consoleUrl ? <ExternalLink href={consoleUrl}>View in Claude</ExternalLink> : <span />}
            {canEdit ? (
              <Button
                type="button"
                variant="secondary"
                mode="filled"
                size="xs"
                onClick={handleSave}
                isLoading={isSaving}
                disabled={!hasUnsavedChanges || isSaving}
              >
                Save changes
              </Button>
            ) : null}
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <UnsavedChangesAlertDialog
        show={showUnsavedDialog}
        description="You have unsaved changes to your MCP servers. These changes will be lost if you continue."
        onCancel={() => setShowUnsavedDialog(false)}
        onProceed={closeSheet}
      />
    </>
  );
}

function McpSection({
  title,
  children,
  withTopSpacing,
}: {
  title: string;
  children: React.ReactNode;
  withTopSpacing?: boolean;
}) {
  return (
    <section className="flex flex-col">
      <div className={withTopSpacing ? 'px-4 pt-6 pb-2' : 'px-4 pt-1.5 pb-1.5'}>
        <span className="text-text-sub text-label-xs font-medium">{title}</span>
      </div>
      <div className="flex flex-col px-4 gap-3">{children}</div>
    </section>
  );
}

type McpRowProps = {
  entry: McpServer;
  action: 'add' | 'remove';
  disabled: boolean;
  onAdd: (entry: McpServer) => void;
  onRemove: (entry: McpServer) => void;
};

function McpRow({ entry, action, disabled, onAdd, onRemove }: McpRowProps) {
  const Icon = getMcpIcon(entry.id);
  const badgeKind = getMcpBadgeKind(entry);
  const supported = badgeKind === 'oauth';

  const row = (
    <div className="flex items-center gap-3 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        {Icon ? <Icon className="size-5 shrink-0" aria-hidden /> : null}
        <span
          className={
            supported
              ? 'text-text-sub text-label-sm min-w-0 truncate font-medium'
              : 'text-text-soft text-label-sm min-w-0 truncate font-medium'
          }
        >
          {entry.name}
        </span>
        <Badge size="sm" variant="lighter" color="gray" className="shrink-0">
          {getBadgeLabel(badgeKind)}
        </Badge>
      </div>

      {action === 'remove' ? (
        <CompactButton
          variant="ghost"
          size="md"
          icon={RiCloseLine}
          onClick={() => onRemove(entry)}
          disabled={disabled}
          aria-label={`Remove ${entry.name}`}
          className="-mr-1"
        >
          <span className="sr-only">Remove {entry.name}</span>
        </CompactButton>
      ) : (
        <Button
          type="button"
          variant="secondary"
          mode="ghost"
          size="xs"
          trailingIcon={RiAddLine}
          onClick={() => onAdd(entry)}
          disabled={disabled || !supported}
          aria-label={`Add ${entry.name}`}
          className="h-5 shrink-0 gap-1 px-2 -mr-2 disabled:bg-transparent"
        >
          Add
        </Button>
      )}
    </div>
  );

  if (supported) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{row}</div>
      </TooltipTrigger>
      <TooltipContent side="left">
        {badgeKind === 'managed-in-claude'
          ? 'This integration is managed inside Claude — connect it from your Claude console.'
          : 'Coming soon — OAuth wiring not yet available.'}
      </TooltipContent>
    </Tooltip>
  );
}
