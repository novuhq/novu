import {
  CONVERSATIONAL_PROVIDERS,
  type ConversationalProvider,
  type IIntegration,
  providers as novuProviders,
  PROVIDER_ID_TO_CHANNEL_MAP,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiAddLine, RiExpandUpDownLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';
import { addAgentIntegration, getAgentDetailQueryKey, getAgentIntegrationsQueryKey } from '@/api/agents';
import { NovuApiError } from '@/api/api.client';
import { createIntegration } from '@/api/integrations';
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
import { showErrorToast, showSuccessToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';

type DropdownItem = {
  providerId: string;
  displayName: string;
  comingSoon: boolean;
  integration?: IIntegration;
};

type ProviderDropdownProps = {
  /** When set, trigger and list highlight match this integration. */
  selectedIntegrationId: string | undefined;
  /** Optional label when no integration is selected yet; omit to show the empty placeholder. */
  fallbackProviderId?: string;
  onSelect: (providerId: string, integration?: IIntegration) => void;
  agentIdentifier: string;
  /** Integration IDs already linked to the agent — selecting one of these skips the link API call. */
  linkedIntegrationIds?: Set<string>;
  /** When true, hide integrations whose _id is in `linkedIntegrationIds` from the list. */
  excludeLinked?: boolean;
  /** Override the default trigger button. Receives `isBusy` so the caller can disable while linking. */
  renderTrigger?: (props: { isBusy: boolean }) => React.ReactNode;
};

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

  const supported: DropdownItem[] = [];
  const comingSoon: DropdownItem[] = [];

  for (const cp of conversationalProviders) {
    const providerConfig = novuProviders.find((p) => p.id === cp.providerId);

    if (cp.comingSoon) {
      comingSoon.push({
        providerId: cp.providerId,
        displayName: cp.displayName,
        comingSoon: true,
      });
      continue;
    }

    const existing = integrationsByProvider.get(cp.providerId);

    if (existing?.length) {
      for (const integration of existing) {
        supported.push({
          providerId: cp.providerId,
          displayName: integration.name || providerConfig?.displayName || cp.displayName,
          comingSoon: false,
          integration,
        });
      }
    }

    supported.push({
      providerId: cp.providerId,
      displayName: providerConfig?.displayName || cp.displayName,
      comingSoon: false,
    });
  }

  return { supported, comingSoon };
}

function getSupportedItemKey(item: DropdownItem, index: number): string {
  if (item.integration) {
    return `${item.providerId}-${item.integration._id}`;
  }

  return `${item.providerId}-new-${index}`;
}

function isAlreadyLinkedToAgentConflict(err: unknown): boolean {
  if (!(err instanceof NovuApiError) || err.status !== 409) {
    return false;
  }

  return err.message.includes('already linked');
}

export function ProviderDropdown({
  selectedIntegrationId,
  fallbackProviderId,
  onSelect,
  agentIdentifier,
  linkedIntegrationIds,
  excludeLinked = false,
  renderTrigger,
}: ProviderDropdownProps) {
  const [open, setOpen] = useState(false);
  const [pendingItemKey, setPendingItemKey] = useState<string | null>(null);
  const { integrations } = useFetchIntegrations();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const { supported: allSupported, comingSoon } = useMemo(
    () => buildDropdownItems(CONVERSATIONAL_PROVIDERS, integrations),
    [integrations]
  );

  const supported = useMemo(() => {
    if (!excludeLinked || !linkedIntegrationIds?.size) {
      return allSupported;
    }

    return allSupported.filter((item) => !item.integration || !linkedIntegrationIds.has(item.integration._id));
  }, [allSupported, excludeLinked, linkedIntegrationIds]);

  const selected = useMemo(() => {
    if (selectedIntegrationId) {
      const fromList = supported.find((item) => item.integration?._id === selectedIntegrationId);

      if (fromList) {
        return fromList;
      }
    }

    if (fallbackProviderId) {
      const cfg = novuProviders.find((p) => p.id === fallbackProviderId);

      if (cfg) {
        return {
          providerId: cfg.id,
          displayName: cfg.displayName,
          comingSoon: false,
        };
      }
    }

    return undefined;
  }, [selectedIntegrationId, fallbackProviderId, supported]);

  const isBusy = pendingItemKey !== null;

  const addAgentIntegrationMutation = useMutation({
    mutationFn: async (integrationIdentifier: string) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');

      return addAgentIntegration(environment, agentIdentifier, { integrationIdentifier });
    },
  });

  const createIntegrationMutation = useMutation({
    mutationFn: async (vars: { providerId: string; name: string }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const channel = PROVIDER_ID_TO_CHANNEL_MAP[vars.providerId];

      if (channel == null) {
        throw new Error(`Unknown channel for provider ${vars.providerId}`);
      }

      const response = await createIntegration(
        {
          providerId: vars.providerId,
          channel,
          credentials: {},
          configurations: {},
          name: vars.name,
          active: true,
          _environmentId: environment._id,
        },
        environment
      );

      return response.data;
    },
  });

  async function handleSelect(item: DropdownItem, index: number) {
    if (item.comingSoon || isBusy) {
      return;
    }

    const environment = currentEnvironment;

    if (!environment?._id) {
      showErrorToast('No environment selected.', 'Cannot link provider');

      return;
    }

    const environmentId = environment._id;

    const itemKey = getSupportedItemKey(item, index);
    setPendingItemKey(itemKey);

    async function invalidateAgentLinkQueries() {
      await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, environmentId] });
      await queryClient.invalidateQueries({
        queryKey: getAgentIntegrationsQueryKey(environmentId, agentIdentifier),
      });
      await queryClient.invalidateQueries({
        queryKey: getAgentDetailQueryKey(environmentId, agentIdentifier),
      });
    }

    try {
      if (item.integration) {
        const alreadyLinked = linkedIntegrationIds?.has(item.integration._id);

        if (!alreadyLinked) {
          try {
            await addAgentIntegrationMutation.mutateAsync(item.integration.identifier);
            showSuccessToast('Integration linked', `${item.integration.name} was added to this agent.`);
          } catch (linkErr) {
            if (!isAlreadyLinkedToAgentConflict(linkErr)) {
              throw linkErr;
            }
          }
        }

        onSelect(item.providerId, item.integration);
        setOpen(false);
      } else {
        const sameProviderCount = (integrations ?? []).filter((i) => i.providerId === item.providerId).length;
        const uniqueName = `${item.displayName} ${sameProviderCount + 1}`;

        const created = await createIntegrationMutation.mutateAsync({
          providerId: item.providerId,
          name: uniqueName,
        });
        await addAgentIntegrationMutation.mutateAsync(created.identifier);
        showSuccessToast('Integration linked', `${created.name} was added to this agent.`);
        onSelect(item.providerId, created);
        setOpen(false);
      }

      await invalidateAgentLinkQueries();
    } catch (err) {
      if (item.integration && isAlreadyLinkedToAgentConflict(err)) {
        onSelect(item.providerId, item.integration);
        setOpen(false);
        await invalidateAgentLinkQueries();

        return;
      }

      const message = err instanceof NovuApiError ? err.message : 'Could not link integration.';

      showErrorToast(message, 'Link failed');
    } finally {
      setPendingItemKey(null);
    }
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

  const popoverContent = (
    <PopoverContent
      className="w-(--radix-popover-trigger-width) max-w-[320px] min-w-[220px] overflow-hidden p-0"
      align="start"
    >
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
            <CommandGroup
              heading="Providers"
              className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
            >
              {supported.map((item, index) => {
                const itemKey = getSupportedItemKey(item, index);
                const isRowPending = pendingItemKey === itemKey;

                return (
                  <CommandItem
                    key={itemKey}
                    value={`${item.displayName} ${item.providerId}${item.integration ? ` ${item.integration.identifier}` : ''}`}
                    disabled={isBusy}
                    onSelect={() => {
                      void handleSelect(item, index);
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-md p-1',
                      item.integration?._id === selectedIntegrationId && 'bg-bg-muted'
                    )}
                  >
                    <div className="flex flex-1 items-center gap-1">
                      <ProviderIcon
                        providerId={item.providerId}
                        providerDisplayName={item.displayName}
                        className="size-4 shrink-0"
                      />
                      <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">
                        {item.displayName}
                      </span>
                    </div>

                    {isRowPending ? (
                      <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
                    ) : item.integration ? (
                      <span className="font-code text-text-sub shrink-0 text-[10px] leading-[15px] tracking-[-0.2px]">
                        {item.integration.identifier}
                      </span>
                    ) : (
                      <RiAddLine className="text-text-soft size-3 shrink-0" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          )}

          {comingSoon.length > 0 && (
            <CommandGroup
              heading="Coming soon"
              className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
            >
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
    </PopoverContent>
  );

  if (renderTrigger) {
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>{renderTrigger({ isBusy })}</PopoverTrigger>
        {popoverContent}
      </Popover>
    );
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-px">
        <span className="text-text-sub text-label-xs font-medium leading-4">
          What provider would you like to start with
        </span>
        <span className="text-text-soft ml-0.5 text-[10px]">&#9432;</span>
      </div>

      <div className="w-full max-w-[320px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>{defaultTrigger}</PopoverTrigger>
          {popoverContent}
        </Popover>
      </div>

      <p className="text-text-soft text-label-xs font-medium leading-4">{'💡 You can always add more providers.'}</p>
    </div>
  );
}
