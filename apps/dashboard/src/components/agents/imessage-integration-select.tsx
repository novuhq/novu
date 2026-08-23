import { ChatProviderIdEnum, type IIntegration } from '@novu/shared';
import { createContext, type PropsWithChildren, useContext, useMemo, useState } from 'react';
import { RiAddLine, RiArrowLeftSLine, RiArrowRightSLine, RiExpandUpDownLine, RiLoader4Line } from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';

/**
 * Called with the vendor the user picked and, when they chose an existing
 * integration, that integration. Omitting the integration means "create a new
 * one for this vendor". Hosts own what selecting does — onboarding switches the
 * guide's integration, the Channels tab links it and opens its guide.
 */
type SelectImessageIntegration = (providerId: string, integration?: IIntegration) => Promise<unknown>;

const ImessageIntegrationSelectContext = createContext<SelectImessageIntegration | null>(null);

export function ImessageIntegrationSelectProvider({
  onSelect,
  children,
}: PropsWithChildren<{ onSelect: SelectImessageIntegration }>) {
  return (
    <ImessageIntegrationSelectContext.Provider value={onSelect}>{children}</ImessageIntegrationSelectContext.Provider>
  );
}

type ImessageVendor = {
  providerId: string;
  label: string;
  integrations: IIntegration[];
};

const IMESSAGE_VENDOR_LABELS: { providerId: string; label: string }[] = [
  { providerId: ChatProviderIdEnum.Sendblue, label: 'Sendblue' },
  { providerId: ChatProviderIdEnum.PhotonImessage, label: 'Photon' },
];

const groupHeadingClassName =
  '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

function newIntegrationKey(providerId: string): string {
  return `${providerId}-new`;
}

/**
 * The "Setup iMessage via" picker shared by the iMessage setup guides: pick a
 * vendor (Sendblue, Photon), then one of that vendor's existing integrations or
 * a new one. The trigger reflects `selectedIntegrationId`, so a guide opened for
 * an integration picked elsewhere (e.g. the Channels tab) shows it already
 * selected. Without a surrounding ImessageIntegrationSelectProvider the picker
 * is read-only.
 */
export function ImessageIntegrationSelect({
  providerId,
  selectedIntegrationId,
}: {
  providerId: string;
  selectedIntegrationId: string;
}) {
  const onSelect = useContext(ImessageIntegrationSelectContext);
  const { integrations } = useFetchIntegrations();
  const { currentEnvironment } = useEnvironment();
  const [isOpen, setIsOpen] = useState(false);
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  // /integrations answers with every environment of the organization, so the
  // list has to be scoped here — linking a Production integration to an agent
  // being set up in Development would never deliver.
  const environmentIntegrations = useMemo(
    () => (integrations ?? []).filter((integration) => integration._environmentId === currentEnvironment?._id),
    [integrations, currentEnvironment?._id]
  );

  const vendors: ImessageVendor[] = useMemo(
    () =>
      IMESSAGE_VENDOR_LABELS.map((vendor) => ({
        ...vendor,
        integrations: environmentIntegrations.filter((integration) => integration.providerId === vendor.providerId),
      })),
    [environmentIntegrations]
  );

  const selectedIntegration = useMemo(
    () => environmentIntegrations.find((integration) => integration._id === selectedIntegrationId),
    [environmentIntegrations, selectedIntegrationId]
  );

  const selectedVendor = vendors.find(
    (vendor) => vendor.providerId === (selectedIntegration?.providerId ?? providerId)
  );
  const selectedLabel = selectedIntegration?.name || selectedVendor?.label || 'Select integration...';

  const expandedVendor = expandedProviderId
    ? (vendors.find((vendor) => vendor.providerId === expandedProviderId) ?? null)
    : null;

  const isBusy = pendingKey !== null;
  const isDisabled = !onSelect || isBusy;

  function handleOpenChange(next: boolean) {
    setIsOpen(next);
    if (!next) setExpandedProviderId(null);
  }

  async function handleSelect(key: string, vendorProviderId: string, integration?: IIntegration) {
    if (!onSelect || isBusy) return;

    if (integration && integration._id === selectedIntegrationId) {
      handleOpenChange(false);

      return;
    }

    setPendingKey(key);

    try {
      await onSelect(vendorProviderId, integration);
      handleOpenChange(false);
    } finally {
      setPendingKey(null);
    }
  }

  const vendorList = (
    <Command>
      <CommandList className="max-h-[260px] p-1">
        <CommandGroup heading="iMessage providers" className={groupHeadingClassName}>
          {vendors.map((vendor) => {
            const hasIntegrations = vendor.integrations.length > 0;
            const isSelectedVendor = vendor.providerId === selectedVendor?.providerId;

            return (
              <CommandItem
                key={vendor.providerId}
                value={`${vendor.label} ${vendor.providerId}`}
                disabled={isDisabled}
                onSelect={() => {
                  if (isDisabled) return;

                  if (hasIntegrations) {
                    setExpandedProviderId(vendor.providerId);

                    return;
                  }

                  void handleSelect(newIntegrationKey(vendor.providerId), vendor.providerId);
                }}
                className={cn('flex items-center gap-2 rounded-md p-1', isSelectedVendor && 'bg-bg-muted')}
              >
                <div className="flex w-full min-w-0 items-center gap-1">
                  <ProviderIcon
                    providerId={vendor.providerId}
                    providerDisplayName={vendor.label}
                    className="size-4 shrink-0"
                  />
                  <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                    {vendor.label}
                  </span>
                  {pendingKey === newIntegrationKey(vendor.providerId) ? (
                    <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
                  ) : (
                    hasIntegrations && (
                      <span className="text-text-soft flex shrink-0 items-center gap-0.5 text-[10px] leading-[15px]">
                        {vendor.integrations.length === 1
                          ? '1 integration'
                          : `${vendor.integrations.length} integrations`}
                        <RiArrowRightSLine className="size-3" />
                      </span>
                    )
                  )}
                </div>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  const integrationList = expandedVendor && (
    <Command>
      <button
        type="button"
        onClick={() => setExpandedProviderId(null)}
        className="bg-bg-weak border-stroke-weak hover:bg-bg-soft flex w-full items-center gap-1.5 border-b px-2 py-1.5 transition-colors"
      >
        <RiArrowLeftSLine className="text-text-soft size-3.5 shrink-0" />
        <ProviderIcon
          providerId={expandedVendor.providerId}
          providerDisplayName={expandedVendor.label}
          className="size-4 shrink-0"
        />
        <span className="text-text-sub text-label-xs font-medium leading-4">{expandedVendor.label}</span>
      </button>

      <CommandList className="max-h-[260px] p-1">
        <CommandGroup heading="Existing" className={groupHeadingClassName}>
          {expandedVendor.integrations.map((integration) => (
            <CommandItem
              key={integration._id}
              value={`${integration.name || expandedVendor.label} ${integration.identifier}`}
              disabled={isDisabled}
              onSelect={() => void handleSelect(integration._id, expandedVendor.providerId, integration)}
              className={cn(
                'flex items-center gap-2 rounded-md p-1',
                integration._id === selectedIntegrationId && 'bg-bg-muted'
              )}
            >
              <div className="flex w-full min-w-0 items-center gap-1">
                <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                  {integration.name || expandedVendor.label}
                </span>
                {pendingKey === integration._id ? (
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
          ))}
        </CommandGroup>

        <div className="bg-stroke-weak mx-1 my-1 h-px" role="presentation" />

        <CommandItem
          value={`create new ${expandedVendor.label}`}
          disabled={isDisabled}
          onSelect={() => void handleSelect(newIntegrationKey(expandedVendor.providerId), expandedVendor.providerId)}
          className="flex items-center gap-1.5 rounded-md p-1"
        >
          {pendingKey === newIntegrationKey(expandedVendor.providerId) ? (
            <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
          ) : (
            <RiAddLine className="text-text-soft size-3 shrink-0" aria-hidden />
          )}
          <span className="text-text-sub text-label-xs font-medium leading-4">
            Create another {expandedVendor.label} integration
          </span>
        </CommandItem>
      </CommandList>
    </Command>
  );

  return (
    <div className="flex w-full max-w-[400px] flex-col gap-1.5">
      <span className="text-text-sub text-label-xs font-medium leading-4">iMessage provider</span>
      <Popover open={isOpen} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={isDisabled}
            aria-label="Select the iMessage provider and integration"
            className="border-stroke-soft bg-bg-white flex h-7 w-full max-w-[280px] items-center justify-between gap-1 overflow-hidden rounded-md border px-1.5 py-1 shadow-xs disabled:opacity-60"
          >
            <span className="flex min-w-0 items-center gap-1">
              {selectedVendor ? (
                <ProviderIcon
                  providerId={selectedVendor.providerId}
                  providerDisplayName={selectedVendor.label}
                  className="size-4 shrink-0"
                />
              ) : null}
              <span className="text-text-strong text-label-xs truncate font-medium leading-4">{selectedLabel}</span>
            </span>
            {isBusy ? (
              <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
            ) : (
              <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
            )}
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-(--radix-popover-trigger-width) min-w-[220px] max-w-[320px] overflow-hidden p-0"
          align="start"
        >
          {expandedVendor ? integrationList : vendorList}
        </PopoverContent>
      </Popover>
    </div>
  );
}
