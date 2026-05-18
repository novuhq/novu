import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  emailProviders as emailProviderConfigs,
  type IIntegration,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import {
  RiAddLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiExpandUpDownLine,
  RiLoader4Line,
  RiSearchLine,
} from 'react-icons/ri';
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
import { showErrorToast } from '@/components/primitives/sonner-helpers';
import { requireEnvironment, useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { QueryKeys } from '@/utils/query-keys';
import { cn } from '@/utils/ui';

type OutboundProviderType = {
  providerId: string;
  displayName: string;
  integrations: IIntegration[];
};

type OutboundInstanceItem = {
  providerId: string;
  displayName: string;
  integration?: IIntegration;
};

const DEMO_PROVIDER_CONFIG = emailProviderConfigs.find((p) => p.id === EmailProviderIdEnum.Novu);
const DEMO_PROVIDER_DISPLAY_NAME = DEMO_PROVIDER_CONFIG?.displayName ?? 'Novu Email';

const EXCLUDED_OUTBOUND_PROVIDERS = new Set<string>([EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.Novu]);
const OUTBOUND_EMAIL_PROVIDERS = emailProviderConfigs.filter((p) => !EXCLUDED_OUTBOUND_PROVIDERS.has(p.id));

function DemoBadge() {
  return (
    <span className="bg-away-lighter text-away-base rounded px-1 py-px text-[10px] font-medium uppercase leading-3 tracking-wide">
      Demo
    </span>
  );
}

function buildOutboundItems(allIntegrations: IIntegration[] | undefined): OutboundProviderType[] {
  const integrationsByProvider = new Map<string, IIntegration[]>();
  for (const i of allIntegrations ?? []) {
    if (i.channel !== ChannelTypeEnum.EMAIL) continue;
    if (EXCLUDED_OUTBOUND_PROVIDERS.has(i.providerId)) continue;
    const list = integrationsByProvider.get(i.providerId) ?? [];
    list.push(i);
    integrationsByProvider.set(i.providerId, list);
  }

  return OUTBOUND_EMAIL_PROVIDERS.map((cfg) => ({
    providerId: cfg.id,
    displayName: cfg.displayName,
    integrations: integrationsByProvider.get(cfg.id) ?? [],
  }));
}

function getInstanceKey(item: OutboundInstanceItem, index: number): string {
  return item.integration ? `${item.providerId}-${item.integration._id}` : `${item.providerId}-new-${index}`;
}

const groupHeadingClassName =
  '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

export function OutboundProviderSelect({
  selectedId,
  onSelect,
  hideLabel = false,
}: {
  selectedId: string | undefined;
  onSelect: (integrationId: string) => void;
  hideLabel?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const { integrations } = useFetchIntegrations();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const providerTypes = useMemo(() => buildOutboundItems(integrations), [integrations]);

  const expandedProvider = useMemo(
    () => (expandedProviderId ? (providerTypes.find((p) => p.providerId === expandedProviderId) ?? null) : null),
    [expandedProviderId, providerTypes]
  );

  // The env's bundled Novu Email demo integration row (auto-seeded for
  // Development environments alongside the org). When the agent's outbound
  // points here, the runtime overrides credentials with the cloud demo API
  // key and rate-limits via the shared quota. Hidden from the dropdown when
  // the env doesn't have a demo row at all (custom non-prod envs).
  const novuDemoIntegration = useMemo(
    () =>
      integrations?.find(
        (i) => i.channel === ChannelTypeEnum.EMAIL && i.providerId === EmailProviderIdEnum.Novu && i.active === true
      ),
    [integrations]
  );

  const isDemoSelected = Boolean(novuDemoIntegration) && selectedId === novuDemoIntegration?._id;

  const selected = useMemo(() => {
    if (isDemoSelected && novuDemoIntegration) {
      return {
        providerId: EmailProviderIdEnum.Novu,
        displayName: novuDemoIntegration.name || DEMO_PROVIDER_DISPLAY_NAME,
        isDemo: true,
      };
    }

    for (const pt of providerTypes) {
      const match = pt.integrations.find((i) => i._id === selectedId);
      if (match) return { providerId: pt.providerId, displayName: match.name || pt.displayName, isDemo: false };
    }

    return undefined;
  }, [providerTypes, selectedId, isDemoSelected, novuDemoIntegration]);

  const isBusy = pendingKey !== null;

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setExpandedProviderId(null);
  }

  const createMutation = useMutation({
    mutationFn: async (vars: { providerId: string; name: string }) => {
      const environment = requireEnvironment(currentEnvironment, 'No environment selected');
      const response = await createIntegration(
        {
          providerId: vars.providerId,
          channel: ChannelTypeEnum.EMAIL,
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

  async function handleSelect(item: OutboundInstanceItem, index: number) {
    if (isBusy) return;
    if (!currentEnvironment?._id) {
      showErrorToast('No environment selected.', 'Cannot select provider');

      return;
    }

    const key = getInstanceKey(item, index);
    setPendingKey(key);

    try {
      if (item.integration) {
        onSelect(item.integration._id);
      } else {
        const existingNames = new Set(
          (integrations ?? []).filter((i) => i.providerId === item.providerId).map((i) => i.name)
        );
        let suffix = existingNames.size + 1;
        while (existingNames.has(`${item.displayName} ${suffix}`)) suffix += 1;
        const created = await createMutation.mutateAsync({
          providerId: item.providerId,
          name: `${item.displayName} ${suffix}`,
        });
        await queryClient.invalidateQueries({ queryKey: [QueryKeys.fetchIntegrations, currentEnvironment?._id] });
        onSelect(created._id);
      }
      setOpen(false);
      setExpandedProviderId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not select provider.';
      showErrorToast(message, 'Selection failed');
    } finally {
      setPendingKey(null);
    }
  }

  function handleSelectDemo() {
    if (isBusy) return;
    if (!novuDemoIntegration) return;
    onSelect(novuDemoIntegration._id);
    setOpen(false);
    setExpandedProviderId(null);
  }

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
        <CommandEmpty className="text-text-soft text-label-xs py-4">No email providers found.</CommandEmpty>
        {novuDemoIntegration ? (
          <CommandGroup heading="Default · for testing" className={groupHeadingClassName}>
            <CommandItem
              key="__demo__"
              value={`${DEMO_PROVIDER_DISPLAY_NAME} demo novu email`}
              disabled={isBusy}
              onSelect={handleSelectDemo}
              className={cn('flex items-center gap-2 rounded-md p-1', isDemoSelected && 'bg-bg-muted')}
            >
              <div className="flex w-full min-w-0 items-center gap-1">
                <ProviderIcon
                  providerId={EmailProviderIdEnum.Novu}
                  providerDisplayName={DEMO_PROVIDER_DISPLAY_NAME}
                  className="size-4 shrink-0"
                />
                <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                  {novuDemoIntegration.name || DEMO_PROVIDER_DISPLAY_NAME}
                </span>
                <DemoBadge />
              </div>
            </CommandItem>
          </CommandGroup>
        ) : null}
        <CommandGroup heading="Production providers" className={groupHeadingClassName}>
          {providerTypes.map((pt) => {
            const hasInstances = pt.integrations.length > 0;
            const isAnyInstanceSelected = pt.integrations.some((i) => i._id === selectedId);

            return (
              <CommandItem
                key={pt.providerId}
                value={`${pt.displayName} ${pt.providerId}`}
                disabled={isBusy}
                onSelect={() => {
                  if (isBusy) return;
                  if (hasInstances) {
                    setExpandedProviderId(pt.providerId);

                    return;
                  }
                  void handleSelect({ providerId: pt.providerId, displayName: pt.displayName }, 0);
                }}
                className={cn('flex items-center gap-2 rounded-md p-1', isAnyInstanceSelected && 'bg-bg-muted')}
              >
                <div className="flex w-full min-w-0 items-center gap-1">
                  <ProviderIcon
                    providerId={pt.providerId}
                    providerDisplayName={pt.displayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                    {pt.displayName}
                  </span>
                  {hasInstances && (
                    <span className="text-text-soft flex items-center gap-0.5 text-[10px] leading-[15px] shrink-0">
                      {pt.integrations.length === 1 ? '1 connected' : `${pt.integrations.length} connected`}
                      <RiArrowRightSLine className="size-3" />
                    </span>
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const expandedList = expandedProvider && (
    <Command>
      <button
        type="button"
        onClick={() => setExpandedProviderId(null)}
        className="bg-bg-weak border-stroke-weak hover:bg-bg-soft flex w-full items-center gap-1.5 border-b px-2 py-1.5 transition-colors"
      >
        <RiArrowLeftSLine className="text-text-soft size-3.5 shrink-0" />
        <ProviderIcon
          providerId={expandedProvider.providerId}
          providerDisplayName={expandedProvider.displayName}
          className="size-4 shrink-0"
        />
        <span className="text-text-sub text-label-xs font-medium leading-4">{expandedProvider.displayName}</span>
      </button>

      <CommandList className="max-h-[260px] p-1">
        <CommandEmpty className="text-text-soft text-label-xs py-4">No integrations found.</CommandEmpty>

        <CommandGroup heading="Existing" className={groupHeadingClassName}>
          {expandedProvider.integrations.map((integration, index) => {
            const item: OutboundInstanceItem = {
              providerId: expandedProvider.providerId,
              displayName: integration.name || expandedProvider.displayName,
              integration,
            };
            const key = getInstanceKey(item, index);
            const isRowPending = pendingKey === key;

            return (
              <CommandItem
                key={key}
                value={`${integration.name ?? expandedProvider.displayName} ${integration.identifier}`}
                disabled={isBusy}
                onSelect={() => void handleSelect(item, index)}
                className={cn(
                  'flex items-center gap-2 rounded-md p-1',
                  integration._id === selectedId && 'bg-bg-muted'
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

        <div className="bg-stroke-weak mx-1 my-1 h-px" role="presentation" />

        <CommandItem
          value={`create new ${expandedProvider.displayName}`}
          disabled={isBusy}
          onSelect={() =>
            void handleSelect(
              { providerId: expandedProvider.providerId, displayName: expandedProvider.displayName },
              expandedProvider.integrations.length
            )
          }
          className="flex items-center gap-1.5 rounded-md p-1"
        >
          {pendingKey === `${expandedProvider.providerId}-new-${expandedProvider.integrations.length}` ? (
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

  return (
    <div className={cn('flex w-full flex-col gap-1', !hideLabel && 'min-w-[300px]')}>
      {!hideLabel && (
        <div className="flex items-center gap-px">
          <span className="text-text-sub text-label-xs font-medium leading-4">Send emails via</span>
          <span aria-hidden="true" className="text-text-soft ml-0.5 text-[10px]">
            &#9432;
          </span>
        </div>
      )}

      <div className={cn('w-full', !hideLabel && 'max-w-[320px]')}>
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={hideLabel ? 'Send emails via, select email provider' : undefined}
              disabled={isBusy}
              className={cn(
                'border-stroke-soft bg-bg-white flex h-7 w-full items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs disabled:opacity-60',
                !hideLabel && 'max-w-[320px]'
              )}
            >
              {selected ? (
                <div className="flex min-w-0 items-center gap-1">
                  <ProviderIcon
                    providerId={selected.providerId}
                    providerDisplayName={selected.displayName}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-strong text-label-xs min-w-0 truncate font-medium leading-4">
                    {selected.displayName}
                  </span>
                  {selected.isDemo ? <DemoBadge /> : null}
                </div>
              ) : (
                <span className="text-text-soft text-label-xs font-medium leading-4">Select provider...</span>
              )}
              {isBusy ? (
                <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
              ) : (
                <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
              )}
            </button>
          </PopoverTrigger>

          <PopoverContent
            className={cn(
              'w-(--radix-popover-trigger-width) min-w-[220px] overflow-hidden p-0',
              !hideLabel && 'max-w-[320px]'
            )}
            align="start"
          >
            {expandedProvider ? expandedList : collapsedList}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
