import {
  CONVERSATIONAL_PROVIDERS,
  type ConversationalProvider,
  type IIntegration,
  providers as novuProviders,
} from '@novu/shared';
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

type DropdownItem = {
  providerId: string;
  displayName: string;
  comingSoon: boolean;
  integration?: IIntegration;
};

type ProviderDropdownProps = {
  value: string | undefined;
  onSelect: (providerId: string, integration?: IIntegration) => void;
};

function buildDropdownItems(
  conversationalProviders: ConversationalProvider[],
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
    } else {
      supported.push({
        providerId: cp.providerId,
        displayName: providerConfig?.displayName || cp.displayName,
        comingSoon: false,
      });
    }
  }

  return { supported, comingSoon };
}

export function ProviderDropdown({ value, onSelect }: ProviderDropdownProps) {
  const [open, setOpen] = useState(false);
  const { integrations } = useFetchIntegrations();

  const { supported, comingSoon } = useMemo(
    () => buildDropdownItems(CONVERSATIONAL_PROVIDERS, integrations),
    [integrations]
  );

  const allItems = useMemo(() => [...supported, ...comingSoon], [supported, comingSoon]);

  const selected = useMemo(() => {
    if (!value) return undefined;

    return allItems.find((item) => item.providerId === value);
  }, [value, allItems]);

  const handleSelect = (item: DropdownItem) => {
    if (item.comingSoon) return;

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

                {supported.length > 0 && (
                  <CommandGroup
                    heading="Providers"
                    className="**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1"
                  >
                    {supported.map((item) => {
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
                          <span className="text-text-sub text-label-xs flex-1 font-medium leading-4">
                            {item.displayName}
                          </span>
                        </div>
                        <span className="font-code text-text-soft shrink-0 text-[10px] leading-[15px]">soon</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}
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
