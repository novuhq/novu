import { ChannelTypeEnum, type IIntegration, type IProviderConfig, providers as novuProviders } from '@novu/shared';
import { useMemo, useState } from 'react';
import { RiAddLine, RiExpandUpDownLine, RiSearchLine } from 'react-icons/ri';
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
import { useFetchIntegrations } from '@/hooks/use-fetch-integrations';
import { cn } from '@/utils/ui';

const CHANNEL_ORDER: ChannelTypeEnum[] = [
  ChannelTypeEnum.EMAIL,
  ChannelTypeEnum.CHAT,
  ChannelTypeEnum.PUSH,
  ChannelTypeEnum.SMS,
];

const CHANNEL_LABEL: Record<ChannelTypeEnum, string> = {
  [ChannelTypeEnum.IN_APP]: 'In-app',
  [ChannelTypeEnum.EMAIL]: 'Email',
  [ChannelTypeEnum.CHAT]: 'Chat',
  [ChannelTypeEnum.PUSH]: 'Push',
  [ChannelTypeEnum.SMS]: 'SMS',
};

type DropdownItem = {
  providerId: string;
  displayName: string;
  channel: ChannelTypeEnum;
  integration?: IIntegration;
};

type ProviderDropdownProps = {
  value: string | undefined;
  onSelect: (providerId: string, integration?: IIntegration) => void;
};

function buildDropdownGroups(allProviders: IProviderConfig[], integrations: IIntegration[] | undefined) {
  const integrationsByProvider = new Map<string, IIntegration[]>();
  for (const integration of integrations ?? []) {
    const list = integrationsByProvider.get(integration.providerId) ?? [];
    list.push(integration);
    integrationsByProvider.set(integration.providerId, list);
  }

  const grouped = new Map<ChannelTypeEnum, DropdownItem[]>();

  for (const provider of allProviders) {
    if (provider.comingSoon) continue;

    const channel = provider.channel;
    if (!CHANNEL_ORDER.includes(channel)) continue;

    const items = grouped.get(channel) ?? [];
    const existing = integrationsByProvider.get(provider.id);

    if (existing?.length) {
      for (const integration of existing) {
        items.push({
          providerId: provider.id,
          displayName: integration.name || provider.displayName,
          channel,
          integration,
        });
      }
    } else {
      items.push({
        providerId: provider.id,
        displayName: provider.displayName,
        channel,
      });
    }

    grouped.set(channel, items);
  }

  return CHANNEL_ORDER.filter((ch) => grouped.has(ch)).map((channel) => ({
    channel,
    label: CHANNEL_LABEL[channel],
    items: grouped.get(channel) ?? [],
  }));
}

export function ProviderDropdown({ value, onSelect }: ProviderDropdownProps) {
  const [open, setOpen] = useState(false);
  const { integrations } = useFetchIntegrations();

  const groups = useMemo(() => buildDropdownGroups(novuProviders, integrations), [integrations]);

  const selected = useMemo(() => {
    if (!value) return undefined;

    for (const group of groups) {
      const match = group.items.find((item) => item.providerId === value);
      if (match) return match;
    }

    return undefined;
  }, [value, groups]);

  const handleSelect = (item: DropdownItem) => {
    onSelect(item.providerId, item.integration);
    setOpen(false);
  };

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
          <PopoverTrigger asChild>
            <button
              type="button"
              className="border-stroke-soft bg-bg-white flex h-7 w-full max-w-[320px] items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs"
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
              <RiExpandUpDownLine className="text-text-soft size-3" />
            </button>
          </PopoverTrigger>

          <PopoverContent
            className="w-(--radix-popover-trigger-width) max-w-[320px] min-w-[220px] overflow-hidden p-0"
            align="start"
          >
            <Command>
              <div className="bg-bg-weak border-stroke-weak flex items-center gap-2 border-b py-1.5 pl-[12px] pr-[12px]">
                <CommandInput
                  placeholder="Search provider"
                  size="xs"
                  inputRootClassName="min-w-0 flex-1 rounded-none border-none bg-transparent shadow-none divide-none before:ring-0 has-[input:focus]:shadow-none has-[input:focus]:ring-0 focus-within:shadow-none focus-within:ring-0"
                  inputWrapperClassName="h-4 min-h-4 bg-transparent px-0 py-0 hover:[&:not(&:has(input:focus))]:bg-transparent has-[input:disabled]:bg-transparent"
                  className="text-text-sub text-label-xs leading-4 placeholder:text-text-sub h-4 min-h-4 py-0"
                />
                <RiSearchLine className="text-text-soft size-3 shrink-0" />
              </div>

              <CommandList className="max-h-[260px] p-1">
                <CommandEmpty className="text-text-soft text-label-xs py-4">No providers found.</CommandEmpty>

                {groups.map((group) => (
                  <CommandGroup
                    key={group.channel}
                    heading={group.label}
                    className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
                  >
                    {group.items.map((item) => {
                      const itemKey = item.integration
                        ? `${item.providerId}-${item.integration._id}`
                        : item.providerId;

                      return (
                        <CommandItem
                          key={itemKey}
                          value={`${item.displayName} ${item.providerId}`}
                          onSelect={() => handleSelect(item)}
                          className={cn(
                            'flex items-center gap-2 rounded-md p-1',
                            value === item.providerId && 'bg-bg-muted'
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

                          {item.integration ? (
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
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <p className="text-text-soft text-label-xs font-medium leading-4">
        {'💡 You can always add more providers.'}
      </p>
    </div>
  );
}
