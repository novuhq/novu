import {
  AgentRuntimeProviderIdEnum,
  FeatureFlagsKeysEnum,
  isProviderManagedMcp,
  MCP_SERVERS,
  McpConnectionAuthModeEnum,
  type McpServer,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RiAddLine, RiArrowRightUpLine, RiCloseLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';
import {
  type AgentMcpServerEnablement,
  type AgentResponse,
  disableAgentMcpServer,
  ensureProviderManagedVault,
  getAgentMcpServersQueryKey,
  type SetAgentMcpServersFailure,
  setAgentMcpServers,
} from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { McpIcon } from '@/components/agents/mcp-icon';
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
import { useFeatureFlag } from '@/hooks/use-feature-flag';

type McpsSheetProps = {
  agent: AgentResponse;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enabledServers: AgentMcpServerEnablement[];
  consoleUrl?: string;
};

/**
 * Auth modes the dashboard can drive via the staged Save flow. Keep this set
 * in lock-step with the modes wired in `generate-mcp-oauth-url.usecase.ts` /
 * `mcp-oauth-callback.usecase.ts`.
 *
 * `novu-app` is included here but enable / authorize calls are additionally
 * gated server-side by `IS_MCP_NOVU_APP_ENABLED`, so an org without the flag
 * will see a 403 with `error: 'mcp_novu_app_disabled'` on Save (surfaced
 * via the existing `showErrorToast`). `user-app` is still typed-only.
 *
 * `provider-managed` is intentionally NOT in this set — those entries go
 * through a dedicated per-row "Add from Claude" action that talks to a
 * different backend endpoint, so they must never end up in the staged save.
 */
const STAGED_AUTH_MODES = new Set<McpConnectionAuthModeEnum>([
  McpConnectionAuthModeEnum.Dcr,
  McpConnectionAuthModeEnum.NovuApp,
]);

/**
 * Visual + interaction kind for a catalog row in the picker.
 *
 * - `oauth`             → Novu OAuth (dcr / novu-app). Staged Add + bulk Save.
 * - `provider-managed`  → "Add from Claude". Immediate per-row API call that
 *                         opens the provider vault UI in a new tab; bypasses
 *                         the staged Save flow entirely.
 * - `unsupported`       → Catalog entry whose mode is type-defined but not
 *                         wired in the dashboard yet (e.g. `user-app`) OR
 *                         provider-managed entries when the per-org
 *                         `IS_MCP_PROVIDER_MANAGED_ENABLED` flag is off, so
 *                         the row falls back to the "Coming soon" UX instead
 *                         of clicking through to a server-side 403.
 */
type McpBadgeKind = 'oauth' | 'provider-managed' | 'unsupported';

type McpBadgeKindOptions = {
  /**
   * Mirrors the server-side `IS_MCP_PROVIDER_MANAGED_ENABLED` gate. When the
   * flag is off, every `provider-managed` catalog row is downgraded to
   * `unsupported` so the picker shows a disabled "Coming soon" Add button
   * instead of an "Add from Claude" button that would 403 on click.
   */
  providerManagedEnabled: boolean;
};

function getMcpBadgeKind(entry: McpServer, options: McpBadgeKindOptions): McpBadgeKind {
  if (!entry.oauth) {
    return 'unsupported';
  }

  if (entry.oauth.mode === McpConnectionAuthModeEnum.ProviderManaged) {
    return options.providerManagedEnabled ? 'provider-managed' : 'unsupported';
  }

  if (STAGED_AUTH_MODES.has(entry.oauth.mode)) {
    return 'oauth';
  }

  return 'unsupported';
}

function isMcpStagedSavable(entry: McpServer, options: McpBadgeKindOptions): boolean {
  return getMcpBadgeKind(entry, options) === 'oauth';
}

function getBadgeLabel(kind: McpBadgeKind): string {
  switch (kind) {
    case 'oauth':
      return 'OAuth';
    case 'provider-managed':
      return 'Add from Claude';
    case 'unsupported':
      return 'Coming soon';
    default: {
      const _exhaustive: never = kind;

      return _exhaustive;
    }
  }
}

/**
 * Sort actionable entries first, preserving the catalog's intrinsic ordering
 * (popular-first) within each group so the rows users can actually act on
 * surface at the top of every search result. OAuth + provider-managed both
 * count as actionable; only `unsupported` rows sink.
 */
function sortSupportedFirst(entries: McpServer[], options: McpBadgeKindOptions): McpServer[] {
  const actionable: McpServer[] = [];
  const unsupported: McpServer[] = [];

  for (const entry of entries) {
    if (getMcpBadgeKind(entry, options) === 'unsupported') {
      unsupported.push(entry);
    } else {
      actionable.push(entry);
    }
  }

  return [...actionable, ...unsupported];
}

/**
 * Bulk save sends the staged enablement set. Provider-managed rows are kept
 * in `stagedIds` by the immediate add/remove mutations, so the ref alone is
 * the source of truth and a stale `enabledServers` snapshot cannot re-add
 * a row the user just removed.
 */
function buildSaveMcpIds(stagedIds: Set<string>): string[] {
  return [...stagedIds];
}

/**
 * Seed the staged enablement set from the server's enabled list. For demo
 * (NovuAnthropic) agents we additionally drop provider-managed ids: they are
 * already hidden from the catalog and can never be connected, so leaving a
 * stale one in `stagedIds` would silently re-send it on the next Save and
 * trigger an unrelated partial-failure toast.
 */
function seedStagedIds(servers: AgentMcpServerEnablement[], isDemoProviderAgent: boolean): Set<string> {
  return new Set(
    servers
      .filter((server) => !isDemoProviderAgent || !isProviderManagedMcp(server.mcpId))
      .map((server) => server.mcpId)
  );
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
  // Mirror the server-side IS_MCP_PROVIDER_MANAGED_ENABLED gate on the
  // dashboard. When off, every provider-managed catalog row downgrades to
  // the "Coming soon" UX so the immediate per-row "Add from Claude" action
  // never gets a chance to fire and 403.
  const providerManagedEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_MCP_PROVIDER_MANAGED_ENABLED);
  const badgeKindOptions = useMemo<McpBadgeKindOptions>(() => ({ providerManagedEnabled }), [providerManagedEnabled]);
  // The demo (Novu-managed Claude / NovuAnthropic) integration exposes no
  // provider vault, so provider-managed MCPs can never be configured on it —
  // the API rejects them at connect time. We use this both to hide them from
  // the catalog and to keep them out of the staged save set.
  const isDemoProviderAgent = agent.managedRuntime?.providerId === AgentRuntimeProviderIdEnum.NovuAnthropic;
  // Staged enablement set. Mirrors `enabledServers` whenever the sheet opens
  // and is then driven entirely by the in-sheet Add / Remove actions until
  // the user clicks "Save changes" (which commits the diff against the
  // initial snapshot) or discards via the Unsaved changes dialog.
  const [stagedIds, setStagedIds] = useState<Set<string>>(() => seedStagedIds(enabledServers, isDemoProviderAgent));
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
      setStagedIds(seedStagedIds(enabledServersRef.current, isDemoProviderAgent));
      setShowUnsavedDialog(false);
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, isDemoProviderAgent]);

  const hasUnsavedChanges = useMemo(() => {
    if (stagedIds.size !== initialEnabledIds.size) return true;

    for (const id of stagedIds) {
      if (!initialEnabledIds.has(id)) return true;
    }

    return false;
  }, [stagedIds, initialEnabledIds]);

  // Drop provider-managed entries from the picker for demo agents so the
  // catalog only advertises the Novu-handled OAuth modes (dcr / novu-app) the
  // user can actually wire up, matching the onboarding + provision filters.
  const catalogMcps = useMemo(
    () => (isDemoProviderAgent ? MCP_SERVERS.filter((entry) => !isProviderManagedMcp(entry.id)) : MCP_SERVERS),
    [isDemoProviderAgent]
  );

  const filteredMcps = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return catalogMcps;

    return catalogMcps.filter(
      (entry) =>
        entry.name.toLowerCase().includes(query) ||
        entry.description.toLowerCase().includes(query) ||
        entry.id.toLowerCase().includes(query)
    );
  }, [search, catalogMcps]);

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

    return { enabledList: enabled, availableList: sortSupportedFirst(available, badgeKindOptions) };
  }, [filteredMcps, stagedIds, badgeKindOptions]);

  const invalidateMcpsQuery = () =>
    queryClient.invalidateQueries({
      queryKey: getAgentMcpServersQueryKey(currentEnvironment?._id, agent.identifier),
    });

  const saveMutation = useMutation({
    mutationFn: () => {
      const env = requireEnvironment(currentEnvironment, 'No environment selected');

      return setAgentMcpServers(env, agent.identifier, buildSaveMcpIds(stagedIds));
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

  // Tracks which provider-managed row is currently in-flight so we can scope
  // the inline loading spinner to that single Add button instead of disabling
  // every actionable row.
  const [pendingProviderManagedId, setPendingProviderManagedId] = useState<string | null>(null);

  // Provider-managed rows bypass the staged Save flow, so removal also hits
  // the disable endpoint immediately instead of waiting for Save.
  const [pendingProviderManagedRemovalId, setPendingProviderManagedRemovalId] = useState<string | null>(null);

  const disableProviderManagedMutation = useMutation({
    mutationFn: (entry: McpServer) => {
      const env = requireEnvironment(currentEnvironment, 'No environment selected');

      return disableAgentMcpServer(env, agent.identifier, entry.id);
    },
    onSuccess: async (_, entry) => {
      setStagedIds((prev) => {
        if (!prev.has(entry.id)) return prev;

        const next = new Set(prev);
        next.delete(entry.id);

        return next;
      });
      await invalidateMcpsQuery();
    },
    onError: (err: Error) => {
      const message = err instanceof NovuApiError ? err.message : 'Could not remove MCP server.';
      showErrorToast(message, 'Remove failed');
    },
    onSettled: () => {
      setPendingProviderManagedRemovalId(null);
    },
  });

  const providerManagedMutation = useMutation({
    mutationFn: (entry: McpServer) => {
      const env = requireEnvironment(currentEnvironment, 'No environment selected');

      return ensureProviderManagedVault(env, agent.identifier, entry.id);
    },
    onSuccess: async (response, entry) => {
      // Keep the sheet's staged set aligned with server truth so the row moves
      // into "Enabled MCPs" immediately and Save never drops it.
      setStagedIds((prev) => {
        if (prev.has(entry.id)) return prev;

        const next = new Set(prev);
        next.add(entry.id);

        return next;
      });

      // Refresh the enablement list so the section shows the new "Added from
      // Claude" row even before the user finishes connector OAuth upstream.
      await invalidateMcpsQuery();

      // Pop the vault UI in a new tab so the user can finish connector
      // OAuth in Claude. Same-tab navigation would tear down the dashboard
      // mid-edit (and abandon the open sheet) — `_blank` is the explicit
      // choice from the plan.
      window.open(response.vaultUrl, '_blank', 'noopener,noreferrer');
    },
    onError: async (err: Error) => {
      await invalidateMcpsQuery();
      const message = err instanceof NovuApiError ? err.message : 'Could not connect via Claude.';
      showErrorToast(message, 'Add from Claude failed');
    },
    onSettled: () => {
      setPendingProviderManagedId(null);
    },
  });

  const handleStagedAdd = (entry: McpServer) => {
    if (!isMcpStagedSavable(entry, badgeKindOptions)) return;

    setStagedIds((prev) => {
      if (prev.has(entry.id)) return prev;

      const next = new Set(prev);
      next.add(entry.id);

      return next;
    });
  };

  const handleProviderManagedAdd = (entry: McpServer) => {
    if (getMcpBadgeKind(entry, badgeKindOptions) !== 'provider-managed') return;
    if (pendingProviderManagedId) return;
    setPendingProviderManagedId(entry.id);
    providerManagedMutation.mutate(entry);
  };

  const handleRemove = (entry: McpServer) => {
    if (getMcpBadgeKind(entry, badgeKindOptions) === 'provider-managed') {
      if (pendingProviderManagedRemovalId) return;
      setPendingProviderManagedRemovalId(entry.id);
      disableProviderManagedMutation.mutate(entry);

      return;
    }

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
                        badgeKindOptions={badgeKindOptions}
                        pendingProviderManagedId={pendingProviderManagedId}
                        pendingProviderManagedRemovalId={pendingProviderManagedRemovalId}
                        onStagedAdd={handleStagedAdd}
                        onProviderManagedAdd={handleProviderManagedAdd}
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
                        badgeKindOptions={badgeKindOptions}
                        pendingProviderManagedId={pendingProviderManagedId}
                        pendingProviderManagedRemovalId={pendingProviderManagedRemovalId}
                        onStagedAdd={handleStagedAdd}
                        onProviderManagedAdd={handleProviderManagedAdd}
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
  badgeKindOptions: McpBadgeKindOptions;
  /** The id of the provider-managed row whose "Add from Claude" call is in flight, if any. */
  pendingProviderManagedId: string | null;
  /** The id of the provider-managed row whose disable call is in flight, if any. */
  pendingProviderManagedRemovalId: string | null;
  /** Staged add for OAuth (dcr / novu-app) rows — applied on Save. */
  onStagedAdd: (entry: McpServer) => void;
  /** Immediate add for `provider-managed` rows — opens the provider vault UI. */
  onProviderManagedAdd: (entry: McpServer) => void;
  onRemove: (entry: McpServer) => void;
};

function McpRow({
  entry,
  action,
  disabled,
  badgeKindOptions,
  pendingProviderManagedId,
  pendingProviderManagedRemovalId,
  onStagedAdd,
  onProviderManagedAdd,
  onRemove,
}: McpRowProps) {
  const badgeKind = getMcpBadgeKind(entry, badgeKindOptions);
  const isStagedSavable = badgeKind === 'oauth';
  const isProviderManaged = badgeKind === 'provider-managed';
  const isActionable = isStagedSavable || isProviderManaged;
  const isRowPending = isProviderManaged && pendingProviderManagedId === entry.id;
  const isRowRemovalPending = isProviderManaged && pendingProviderManagedRemovalId === entry.id;
  const isOtherProviderManagedPending = isProviderManaged && Boolean(pendingProviderManagedId) && !isRowPending;

  const row = (
    <div className="flex items-center gap-3 py-1">
      <div className="flex min-w-0 flex-1 items-center gap-1">
        <McpIcon mcpId={entry.id} />
        <span
          className={
            isActionable
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

      {action === 'remove'
        ? renderRemoveControl({
            entry,
            disabled: disabled || isRowRemovalPending,
            onRemove,
          })
        : null}

      {action === 'add' && isProviderManaged ? (
        <ProviderManagedActionButton
          label="Add from Claude"
          pending={isRowPending}
          disabled={disabled || isOtherProviderManagedPending}
          onClick={() => onProviderManagedAdd(entry)}
          ariaLabel={`Add ${entry.name} from Claude`}
        />
      ) : null}

      {action === 'add' && !isProviderManaged ? (
        <Button
          type="button"
          variant="secondary"
          mode="ghost"
          size="xs"
          trailingIcon={RiAddLine}
          onClick={() => onStagedAdd(entry)}
          disabled={disabled || !isStagedSavable}
          aria-label={`Add ${entry.name}`}
          className="h-5 shrink-0 gap-1 px-2 -mr-2 disabled:bg-transparent"
        >
          Add
        </Button>
      ) : null}
    </div>
  );

  if (isActionable) {
    return row;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div>{row}</div>
      </TooltipTrigger>
      <TooltipContent side="left">Coming soon — connection not yet available.</TooltipContent>
    </Tooltip>
  );
}

/**
 * Ghost action for provider-managed rows. Avoids `Button` `isLoading` overlay
 * (spinner on top of label) by swapping label ↔ spinner with a fixed min-width.
 */
function ProviderManagedActionButton({
  label,
  pending,
  disabled,
  onClick,
  ariaLabel,
}: {
  label: string;
  pending: boolean;
  disabled: boolean;
  onClick: () => void;
  ariaLabel: string;
}) {
  return (
    <Button
      type="button"
      variant="secondary"
      mode="ghost"
      size="xs"
      onClick={onClick}
      disabled={disabled || pending}
      aria-label={ariaLabel}
      aria-busy={pending || undefined}
      className="h-5 min-w-[7.75rem] shrink-0 justify-center gap-1 px-2 -mr-2 disabled:bg-transparent"
    >
      {pending ? (
        <RiLoader4Line className="text-text-sub size-4 shrink-0 animate-spin" aria-hidden />
      ) : (
        <>
          <span>{label}</span>
          <RiArrowRightUpLine className="size-4 shrink-0" aria-hidden />
        </>
      )}
    </Button>
  );
}

function renderRemoveControl({
  entry,
  disabled,
  onRemove,
}: {
  entry: McpServer;
  disabled: boolean;
  onRemove: (entry: McpServer) => void;
}): React.ReactNode {
  return (
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
  );
}
