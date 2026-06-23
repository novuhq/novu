import {
  ChannelTypeEnum,
  CONVERSATIONAL_PROVIDERS,
  type ConversationalProvider,
  EmailProviderIdEnum,
  type IIntegration,
  providers as novuProviders,
  PROVIDER_ID_TO_CHANNEL_MAP,
} from '@novu/shared';
import { useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiExpandUpDownLine,
  RiExternalLinkLine,
  RiLoader4Line,
  RiLockStarLine,
  RiSearchLine,
} from 'react-icons/ri';
import { useNavigate } from 'react-router-dom';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { IS_SELF_HOSTED, SELF_HOSTED_UPGRADE_REDIRECT_URL } from '@/config';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { useIsAgentEmailAvailable } from '@/hooks/use-is-agent-email-available';
import { useLinkAgentIntegration } from '@/hooks/use-link-agent-integration';
import { ROUTES } from '@/utils/routes';
import { cn } from '@/utils/ui';
import { openInNewTab } from '@/utils/url';

function findLinkedNovuAgentIntegration(
  linkedIntegrationIds: Set<string> | undefined,
  integrations: IIntegration[] | undefined
): IIntegration | undefined {
  if (!linkedIntegrationIds?.size || !integrations?.length) {
    return undefined;
  }

  return integrations.find((i) => i.providerId === EmailProviderIdEnum.NovuAgent && linkedIntegrationIds.has(i._id));
}

/** One row per provider type in the collapsed list. */
type ProviderTypeItem = {
  providerId: string;
  displayName: string;
  comingSoon: boolean;
  requiresBusinessTier: boolean;
  /** All existing integrations for this provider type (empty = none yet). */
  integrations: IIntegration[];
};

/** A single integration instance shown inside the expanded sub-list. */
type DropdownItem = {
  providerId: string;
  displayName: string;
  comingSoon: boolean;
  requiresBusinessTier: boolean;
  integration?: IIntegration;
};

/**
 * Confirmation gating is a paired contract: either both `confirmBeforeLink`
 * and `onConfirmRequired` are provided, or neither. This guarantees that
 * whenever `confirmBeforeLink` defers a selection, `onConfirmRequired` exists
 * to run the deferred link — preventing a silent no-op.
 */
type ConfirmBeforeLinkProps =
  | {
      /**
       * Guard run after a provider is selected but before it is linked.
       * Return `true` to defer the link and require confirmation — the dropdown
       * then calls `onConfirmRequired` with a `proceed` callback instead of linking.
       */
      confirmBeforeLink: (providerId: string) => boolean;
      /** Invoked when `confirmBeforeLink` defers a selection. Call `proceed` to run the deferred link. */
      onConfirmRequired: (proceed: () => void) => void;
    }
  | {
      confirmBeforeLink?: undefined;
      onConfirmRequired?: undefined;
    };

type ProviderDropdownProps = {
  /** When set, trigger and list highlight match this integration. */
  selectedIntegrationId: string | undefined;
  /** Optional label when no integration is selected yet; omit to show the empty placeholder. */
  fallbackProviderId?: string;
  onSelect: (providerId: string, integration?: IIntegration) => void;
  agentIdentifier: string;
  /** Human-readable agent name used as the integration name when creating a new one. Falls back to agentIdentifier. */
  agentName?: string;
  /** Integration IDs already linked to the agent — selecting one of these skips the link API call. */
  linkedIntegrationIds?: Set<string>;
  /** When true, hide integrations whose _id is in `linkedIntegrationIds` from the list. */
  excludeLinked?: boolean;
  /** Override the default trigger button. Receives `isBusy` so the caller can disable while linking. */
  renderTrigger?: (props: { isBusy: boolean }) => React.ReactNode;
  /** Controlled open state — pass together with `onOpenChange` to gate opening (e.g. behind a plan-limit dialog). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
} & ConfirmBeforeLinkProps;

function buildDropdownItems(
  conversationalProviders: readonly ConversationalProvider[],
  integrations: IIntegration[] | undefined
) {
  const integrationsByProvider = new Map<string, IIntegration[]>();
  for (const integration of integrations ?? []) {
    const list = integrationsByProvider.get(integration.providerId) ?? [];
    list.push(integration);
    integrationsByProvider.set(integration.providerId, list);
  }

  const supported: ProviderTypeItem[] = [];
  const comingSoon: ProviderTypeItem[] = [];

  for (const cp of conversationalProviders) {
    const providerConfig = novuProviders.find((p) => p.id === cp.providerId);
    const displayName = providerConfig?.displayName || cp.displayName;

    if (cp.comingSoon) {
      comingSoon.push({
        providerId: cp.providerId,
        displayName,
        comingSoon: true,
        requiresBusinessTier: false,
        integrations: [],
      });
      continue;
    }

    const existing = integrationsByProvider.get(cp.providerId) ?? [];

    supported.push({
      providerId: cp.providerId,
      displayName,
      comingSoon: false,
      requiresBusinessTier: cp.requiresBusinessTier ?? false,
      // NovuAgent is 1:1 per agent — never list other agents' instances (see `findLinkedNovuAgentIntegration`).
      integrations: cp.providerId === EmailProviderIdEnum.NovuAgent ? [] : existing,
    });
  }

  return { supported, comingSoon };
}

function getInstanceItemKey(item: DropdownItem, index: number): string {
  if (item.integration) {
    return `${item.providerId}-${item.integration._id}`;
  }

  return `${item.providerId}-new-${index}`;
}

export function ProviderDropdown({
  selectedIntegrationId,
  fallbackProviderId,
  onSelect,
  agentIdentifier,
  agentName,
  linkedIntegrationIds,
  excludeLinked = false,
  renderTrigger,
  open: controlledOpen,
  onOpenChange,
  confirmBeforeLink,
  onConfirmRequired,
}: ProviderDropdownProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = (next: boolean) => {
    setUncontrolledOpen(next);
    onOpenChange?.(next);
  };
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const { integrations } = useFetchIntegrations();
  const navigate = useNavigate();
  const isAgentEmailAvailable = useIsAgentEmailAvailable();

  const closeDropdown = () => {
    setOpen(false);
    setExpandedProviderId(null);
  };

  const { pendingItemKey, isBusy, linkProvider } = useLinkAgentIntegration({
    agentIdentifier,
    linkedIntegrationIds,
    onLinked: (providerId, integration) => {
      onSelect(providerId, integration);
      closeDropdown();
    },
  });

  const { supported: allSupported, comingSoon } = useMemo(
    () => buildDropdownItems(CONVERSATIONAL_PROVIDERS, integrations),
    [integrations]
  );

  const supported = useMemo(() => {
    let items = allSupported;

    // NovuAgent is 1:1 per agent and the backend enforces it — hiding the row
    // once an instance is linked is an invariant the picker must always honor,
    // independent of the caller's `excludeLinked` preference (which only
    // controls whether *other providers'* already-linked instances are shown).
    if (linkedIntegrationIds?.size) {
      const linkedNovuAgent = findLinkedNovuAgentIntegration(linkedIntegrationIds, integrations);
      if (linkedNovuAgent) {
        items = items.filter((item) => item.providerId !== EmailProviderIdEnum.NovuAgent);
      }
    }

    if (excludeLinked && linkedIntegrationIds?.size) {
      items = items.map((item) => ({
        ...item,
        integrations: item.integrations.filter((i) => !linkedIntegrationIds.has(i._id)),
      }));
    }

    return items;
  }, [allSupported, excludeLinked, linkedIntegrationIds, integrations]);

  const selected = useMemo(() => {
    if (selectedIntegrationId) {
      for (const item of supported) {
        const match = item.integrations.find((i) => i._id === selectedIntegrationId);
        if (match) {
          return { providerId: item.providerId, displayName: match.name || item.displayName };
        }
      }

      const fromAll = integrations?.find((i) => i._id === selectedIntegrationId);
      if (fromAll) {
        const cfg = novuProviders.find((p) => p.id === fromAll.providerId);

        return {
          providerId: fromAll.providerId,
          displayName: fromAll.name || cfg?.displayName || fromAll.providerId,
        };
      }
    }

    if (fallbackProviderId) {
      const cfg = novuProviders.find((p) => p.id === fallbackProviderId);

      if (cfg) {
        return { providerId: cfg.id, displayName: cfg.displayName };
      }
    }

    return undefined;
  }, [selectedIntegrationId, fallbackProviderId, supported, integrations]);

  /** The provider type currently shown in the expanded sub-list view. */
  const expandedProvider = useMemo(
    () => (expandedProviderId ? (supported.find((p) => p.providerId === expandedProviderId) ?? null) : null),
    [expandedProviderId, supported]
  );

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setExpandedProviderId(null);
  }

  async function performLink(item: DropdownItem, index: number) {
    const itemKey = getInstanceItemKey(item, index);
    const channel = PROVIDER_ID_TO_CHANNEL_MAP[item.providerId];
    const newIntegrationName = channel === ChannelTypeEnum.CHAT ? (agentName ?? agentIdentifier) : item.displayName;

    await linkProvider(
      {
        providerId: item.providerId,
        displayName: item.displayName,
        integration: item.integration,
        newIntegrationName,
      },
      itemKey
    );
  }

  async function handleSelect(item: DropdownItem, index: number) {
    if (item.comingSoon || isBusy) {
      return;
    }

    if (item.requiresBusinessTier && !isAgentEmailAvailable) {
      return;
    }

    // Defer to the caller's plan-limit confirmation when the chosen provider
    // would exceed the limit. The link runs only if the user confirms.
    if (confirmBeforeLink?.(item.providerId)) {
      onConfirmRequired?.(() => {
        void performLink(item, index);
      });

      return;
    }

    await performLink(item, index);
  }

  const defaultTrigger = (
    <button
      type="button"
      disabled={isBusy}
      className="border-stroke-soft bg-bg-white flex h-7 w-full max-w-[320px] items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs disabled:opacity-60"
    >
      {selected ? (
        <div className="flex items-center gap-1">
          <ProviderIcon
            providerId={selected.providerId}
            providerDisplayName={selected.displayName}
            className="size-4 shrink-0"
          />
          <span className="text-text-strong text-label-xs font-medium leading-4">{selected.displayName}</span>
        </div>
      ) : (
        <span className="text-text-soft text-label-xs font-medium leading-4">Select provider...</span>
      )}
      {isBusy ? (
        <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
      ) : (
        <RiExpandUpDownLine className="text-text-soft size-3" />
      )}
    </button>
  );

  const groupHeadingClassName =
    '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

  /** Collapsed view — one row per provider type. */
  const collapsedList = (
    <Command>
      <div className="bg-bg-weak border-stroke-weak flex items-center gap-2 border-b py-1.5 pl-3 pr-3">
        <CommandInput
          placeholder="Search provider"
          size="xs"
          disabled={isBusy}
          inputRootClassName="min-w-0 flex-1 rounded-none border-none bg-transparent shadow-none divide-none before:ring-0 has-[input:focus]:shadow-none has-[input:focus]:ring-0 focus-within:shadow-none focus-within:ring-0"
          inputWrapperClassName="h-4 min-h-4 bg-transparent px-0 py-0 hover:[&:not(&:has(input:focus))]:bg-transparent has-[input:disabled]:bg-transparent"
          className="text-text-sub text-label-xs leading-4 placeholder:text-text-sub h-4 min-h-4 py-0"
        />
        <RiSearchLine className="text-text-soft size-3 shrink-0" />
      </div>

      <CommandList className="max-h-[260px] p-1">
        <CommandEmpty className="text-text-soft text-label-xs py-4">No providers found.</CommandEmpty>

        {supported.length > 0 && (
          <CommandGroup heading="Providers" className={groupHeadingClassName}>
            {supported.map((providerType) => {
              const isLocked = providerType.requiresBusinessTier && !isAgentEmailAvailable;
              const hasInstances = providerType.integrations.length > 0;
              const isNovuAgent = providerType.providerId === EmailProviderIdEnum.NovuAgent;
              const isAnyInstanceSelected =
                providerType.integrations.some((i) => i._id === selectedIntegrationId) ||
                (isNovuAgent && selected?.providerId === EmailProviderIdEnum.NovuAgent);

              const rowContent = (
                <div className="flex w-full min-w-0 items-center gap-1 break-normal">
                  <ProviderIcon
                    providerId={providerType.providerId}
                    providerDisplayName={providerType.displayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                    {providerType.displayName}
                  </span>

                  {isLocked && (
                    <div className="flex items-center gap-1 rounded bg-red-50 px-1.5 py-0.5">
                      <RiLockStarLine className="size-2.5 text-pink-600" />
                      <span
                        className="text-[9px] font-semibold uppercase leading-none"
                        style={{
                          background: 'linear-gradient(225deg, #FF884D 23.17%, #E300BD 80.17%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text',
                        }}
                      >
                        Team+
                      </span>
                    </div>
                  )}

                  {!isLocked && hasInstances && !isNovuAgent && (
                    <span className="text-text-soft flex items-center gap-0.5 text-[10px] leading-[15px] shrink-0">
                      {providerType.integrations.length === 1
                        ? '1 connected'
                        : `${providerType.integrations.length} connected`}
                      <RiArrowRightSLine className="size-3" />
                    </span>
                  )}
                </div>
              );

              function handleTypeRowSelect() {
                if (isBusy) return;

                if (isLocked) {
                  setOpen(false);
                  setExpandedProviderId(null);
                  if (IS_SELF_HOSTED) {
                    openInNewTab(`${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=agent_email_integration`);
                  } else {
                    navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=agent_provider_dropdown`);
                  }

                  return;
                }

                if (!isNovuAgent && hasInstances) {
                  setExpandedProviderId(providerType.providerId);

                  return;
                }

                void handleSelect(
                  {
                    providerId: providerType.providerId,
                    displayName: providerType.displayName,
                    comingSoon: false,
                    requiresBusinessTier: providerType.requiresBusinessTier,
                  },
                  0
                );
              }

              return (
                <CommandItem
                  key={providerType.providerId}
                  value={`${providerType.displayName} ${providerType.providerId}`}
                  disabled={isBusy}
                  aria-disabled={isLocked || undefined}
                  onSelect={handleTypeRowSelect}
                  className={cn(
                    'flex min-w-0 items-center gap-2 rounded-md p-1',
                    isAnyInstanceSelected && 'bg-bg-muted',
                    isLocked && '!pointer-events-auto opacity-60'
                  )}
                >
                  {isLocked ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div tabIndex={0} role="button">
                          {rowContent}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        align="start"
                        variant="light"
                        size="lg"
                        className="flex w-64 flex-col items-start gap-3 border border-neutral-100 p-2 shadow-md"
                      >
                        <div className="flex items-center gap-1 rounded bg-red-50 px-2 py-1">
                          <RiLockStarLine className="h-3 w-3 text-pink-600" />
                          <span
                            className="text-[10px] font-medium uppercase leading-normal"
                            style={{
                              background: 'linear-gradient(225deg, #FF884D 23.17%, #E300BD 80.17%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                            }}
                          >
                            Team feature
                          </span>
                        </div>
                        <div className="flex flex-col items-start gap-3">
                          <p className="text-xs text-neutral-500">
                            Agent email requires the Team plan. Upgrade to connect an inbound email address.
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpen(false);
                              setExpandedProviderId(null);
                              if (IS_SELF_HOSTED) {
                                openInNewTab(
                                  `${SELF_HOSTED_UPGRADE_REDIRECT_URL}?utm_campaign=agent_email_integration`
                                );
                              } else {
                                navigate(`${ROUTES.SETTINGS_BILLING}?utm_source=agent_provider_dropdown`);
                              }
                            }}
                            className="flex items-center gap-1 text-xs font-medium text-neutral-900 hover:underline"
                          >
                            Upgrade plan <RiExternalLinkLine className="h-3 w-3" />
                          </button>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    rowContent
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {comingSoon.length > 0 && (
          <CommandGroup heading="Coming soon" className={groupHeadingClassName}>
            {comingSoon.map((item) => (
              <CommandItem
                key={item.providerId}
                value={`${item.displayName} ${item.providerId}`}
                disabled
                className="flex items-center gap-2 rounded-md p-1 opacity-50"
              >
                <div className="flex flex-1 items-center gap-1">
                  <ProviderIcon
                    providerId={item.providerId}
                    providerDisplayName={item.displayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">{item.displayName}</span>
                </div>
                <span className="font-code text-text-soft shrink-0 text-[10px] leading-[15px]">soon</span>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </Command>
  );

  /** Expanded sub-list — instances of a specific provider type + "Create another" footer. */
  const expandedList = expandedProvider && (
    <Command>
      {/* Back header */}
      <div className="bg-bg-weak border-stroke-weak flex w-full items-center border-b">
        <button
          type="button"
          onClick={() => setExpandedProviderId(null)}
          className="hover:bg-bg-soft flex flex-1 items-center gap-1.5 px-2 py-1.5 transition-colors"
        >
          <RiArrowLeftSLine className="text-text-soft size-3.5 shrink-0" />
          <ProviderIcon
            providerId={expandedProvider.providerId}
            providerDisplayName={expandedProvider.displayName}
            className="size-4 shrink-0"
          />
          <span className="text-text-sub text-label-xs font-medium leading-4">{expandedProvider.displayName}</span>
        </button>
        <button
          type="button"
          disabled={isBusy}
          aria-label={`Create another ${expandedProvider.displayName} integration`}
          onClick={() => {
            void handleSelect(
              {
                providerId: expandedProvider.providerId,
                displayName: expandedProvider.displayName,
                comingSoon: false,
                requiresBusinessTier: expandedProvider.requiresBusinessTier,
              },
              expandedProvider.integrations.length
            );
          }}
          className="hover:bg-bg-soft flex items-center justify-center px-2 py-1.5 transition-colors disabled:opacity-60"
        >
          {pendingItemKey === `${expandedProvider.providerId}-new-${expandedProvider.integrations.length}` ? (
            <RiLoader4Line className="text-text-soft size-3.5 shrink-0 animate-spin" aria-hidden />
          ) : (
            <RiAddLine className="text-text-soft size-3.5 shrink-0" aria-hidden />
          )}
        </button>
      </div>

      <CommandList className="max-h-[260px] p-1">
        <CommandEmpty className="text-text-soft text-label-xs py-4">No integrations found.</CommandEmpty>

        <CommandGroup heading="Existing" className={groupHeadingClassName}>
          {expandedProvider.integrations.map((integration, index) => {
            const item: DropdownItem = {
              providerId: expandedProvider.providerId,
              displayName: integration.name || expandedProvider.displayName,
              comingSoon: false,
              requiresBusinessTier: expandedProvider.requiresBusinessTier,
              integration,
            };
            const itemKey = getInstanceItemKey(item, index);
            const isRowPending = pendingItemKey === itemKey;

            return (
              <CommandItem
                key={itemKey}
                value={`${integration.name ?? expandedProvider.displayName} ${integration.identifier}`}
                disabled={isBusy}
                onSelect={() => void handleSelect(item, index)}
                className={cn(
                  'flex min-w-0 items-center gap-2 rounded-md p-1',
                  integration._id === selectedIntegrationId && 'bg-bg-muted'
                )}
              >
                <div className="flex w-full min-w-0 items-center gap-1">
                  <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                    {integration.name || expandedProvider.displayName}
                  </span>
                  {isRowPending ? (
                    <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    <span
                      className="font-code text-text-soft max-w-[min(7.5rem,45%)] min-w-0 shrink truncate text-[10px] leading-[15px] tracking-[-0.2px]"
                      title={integration.identifier}
                    >
                      {integration.identifier}
                    </span>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {/* Separator + Create another footer */}
        <div className="bg-stroke-weak mx-1 my-1 h-px" role="presentation" />

        <CommandItem
          value={`create new ${expandedProvider.displayName}`}
          disabled={isBusy}
          onSelect={() => {
            void handleSelect(
              {
                providerId: expandedProvider.providerId,
                displayName: expandedProvider.displayName,
                comingSoon: false,
                requiresBusinessTier: expandedProvider.requiresBusinessTier,
              },
              expandedProvider.integrations.length
            );
          }}
          className="flex items-center gap-1.5 rounded-md p-1"
        >
          {pendingItemKey === `${expandedProvider.providerId}-new-${expandedProvider.integrations.length}` ? (
            <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
          ) : (
            <RiAddLine className="text-text-soft size-3 shrink-0" aria-hidden />
          )}
          <span className="text-text-sub text-label-xs font-medium leading-4">
            Create another {expandedProvider.displayName} integration
          </span>
        </CommandItem>
      </CommandList>
    </Command>
  );

  const popoverContent = (
    <PopoverContent
      className="w-(--radix-popover-trigger-width) max-w-[320px] min-w-[220px] overflow-hidden p-0"
      align="start"
    >
      {expandedProvider ? expandedList : collapsedList}
    </PopoverContent>
  );

  if (renderTrigger) {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>{renderTrigger({ isBusy })}</PopoverTrigger>
        {popoverContent}
      </Popover>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1 min-w-[300px]">
      <div className="flex items-center gap-px">
        <span className="text-text-sub text-label-xs font-medium leading-4">
          What provider would you like to start with
        </span>
        <span className="text-text-soft ml-0.5 text-[10px]">&#9432;</span>
      </div>

      <div className="w-full">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>{defaultTrigger}</PopoverTrigger>
          {popoverContent}
        </Popover>
      </div>
    </div>
  );
}
