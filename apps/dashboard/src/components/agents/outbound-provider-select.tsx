import {
  ChannelTypeEnum,
  EmailProviderIdEnum,
  emailProviders as emailProviderConfigs,
  type IIntegration,
} from '@novu/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { RiAddLine, RiExpandUpDownLine, RiLoader4Line, RiSearchLine } from 'react-icons/ri';
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

type OutboundDropdownItem = {
  providerId: string;
  displayName: string;
  integration?: IIntegration;
};

const EXCLUDED_OUTBOUND_PROVIDERS = new Set<string>([EmailProviderIdEnum.NovuAgent, EmailProviderIdEnum.Novu]);
const OUTBOUND_EMAIL_PROVIDERS = emailProviderConfigs.filter((p) => !EXCLUDED_OUTBOUND_PROVIDERS.has(p.id));

function buildOutboundItems(allIntegrations: IIntegration[] | undefined): OutboundDropdownItem[] {
  const integrationsByProvider = new Map<string, IIntegration[]>();
  for (const i of allIntegrations ?? []) {
    if (i.channel !== ChannelTypeEnum.EMAIL) continue;
    if (EXCLUDED_OUTBOUND_PROVIDERS.has(i.providerId)) continue;
    const list = integrationsByProvider.get(i.providerId) ?? [];
    list.push(i);
    integrationsByProvider.set(i.providerId, list);
  }

  const items: OutboundDropdownItem[] = [];
  for (const cfg of OUTBOUND_EMAIL_PROVIDERS) {
    const existing = integrationsByProvider.get(cfg.id);
    if (existing?.length) {
      for (const integration of existing) {
        items.push({
          providerId: cfg.id,
          displayName: integration.name || cfg.displayName,
          integration,
        });
      }
    }
    items.push({ providerId: cfg.id, displayName: cfg.displayName });
  }

  return items;
}

function getItemKey(item: OutboundDropdownItem, index: number): string {
  return item.integration ? `${item.providerId}-${item.integration._id}` : `${item.providerId}-new-${index}`;
}

export function OutboundProviderSelect({
  selectedId,
  onSelect,
}: {
  selectedId: string | undefined;
  onSelect: (integrationId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const { integrations } = useFetchIntegrations();
  const { currentEnvironment } = useEnvironment();
  const queryClient = useQueryClient();

  const items = useMemo(() => buildOutboundItems(integrations), [integrations]);

  const selected = useMemo(
    () => (selectedId ? items.find((i) => i.integration?._id === selectedId) : undefined),
    [items, selectedId]
  );

  const isBusy = pendingKey !== null;

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

  async function handleSelect(item: OutboundDropdownItem, index: number) {
    if (isBusy) return;
    if (!currentEnvironment?._id) {
      showErrorToast('No environment selected.', 'Cannot select provider');

      return;
    }

    const key = getItemKey(item, index);
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
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not select provider.';
      showErrorToast(message, 'Selection failed');
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center gap-px">
        <span className="text-text-sub text-label-xs font-medium leading-4">Send emails via</span>
        <span aria-hidden="true" className="text-text-soft ml-0.5 text-[10px]">&#9432;</span>
      </div>

      <div className="w-full max-w-[320px]">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
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
                <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
              )}
            </button>
          </PopoverTrigger>

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
                <CommandEmpty className="text-text-soft text-label-xs py-4">No email providers found.</CommandEmpty>
                <CommandGroup
                  heading="Email providers"
                  className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
                >
                  {items.map((item, index) => {
                    const key = getItemKey(item, index);
                    const isRowPending = pendingKey === key;

                    return (
                      <CommandItem
                        key={key}
                        value={`${item.displayName} ${item.providerId}${item.integration ? ` ${item.integration.identifier}` : ''}`}
                        disabled={isBusy}
                        onSelect={() => {
                          void handleSelect(item, index);
                        }}
                        className={cn(
                          'flex items-center gap-2 rounded-md p-1',
                          item.integration?._id === selectedId && 'bg-bg-muted'
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
                        {isRowPending && (
                          <RiLoader4Line className="text-text-soft size-3 shrink-0 animate-spin" aria-hidden />
                        )}
                        {!isRowPending && item.integration && (
                          <span className="font-code text-text-sub shrink-0 text-[10px] leading-[15px] tracking-[-0.2px]">
                            {item.integration.identifier}
                          </span>
                        )}
                        {!isRowPending && !item.integration && <RiAddLine className="text-text-soft size-3 shrink-0" />}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

    </div>
  );
}
