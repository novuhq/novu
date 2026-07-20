import { useMemo, useState } from 'react';
import { RiSearchLine } from 'react-icons/ri';
import { ProviderIcon } from '@/components/integrations/components/provider-icon';
import { AddButton } from '@/components/primitives/add-button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import type { AddableCredentialRow } from './build-credential-groups';

const SEARCH_THRESHOLD = 5;

type AddIntegrationPickerProps = {
  rows: AddableCredentialRow[];
  channelLabel: string;
  onSelect: (row: AddableCredentialRow) => void;
};

export function AddIntegrationPicker({ rows, channelLabel, onSelect }: AddIntegrationPickerProps) {
  const [open, setOpen] = useState(false);
  const showSearch = rows.length > SEARCH_THRESHOLD;

  const sortedRows = useMemo(() => [...rows].sort((a, b) => a.displayName.localeCompare(b.displayName)), [rows]);

  if (rows.length === 0) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <AddButton
          size="2xs"
          className="p-0.5 hover:bg-transparent"
          tooltip={`Add ${channelLabel.toLowerCase()} credential`}
          aria-label={`Add ${channelLabel.toLowerCase()} credential`}
        />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="pointer-events-auto flex max-h-[min(320px,var(--radix-popover-content-available-height))] w-[280px] flex-col overflow-hidden p-0"
      >
        <Command loop className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {showSearch ? (
            <div className="bg-bg-weak border-stroke-weak flex items-center gap-2 border-b py-1.5 pl-3 pr-3">
              <CommandInput
                placeholder="Search integrations"
                size="xs"
                inputRootClassName="min-w-0 flex-1 rounded-none border-none bg-transparent shadow-none divide-none before:ring-0 has-[input:focus]:shadow-none has-[input:focus]:ring-0 focus-within:shadow-none focus-within:ring-0"
                inputWrapperClassName="h-4 min-h-4 bg-transparent px-0 py-0 hover:[&:not(&:has(input:focus))]:bg-transparent has-[input:disabled]:bg-transparent"
                className="text-text-sub text-label-xs leading-4 placeholder:text-text-sub h-4 min-h-4 py-0"
              />
              <RiSearchLine className="text-text-soft size-3 shrink-0" aria-hidden />
            </div>
          ) : null}
          <CommandList className="min-h-0 flex-1 overflow-y-auto p-1">
            <CommandEmpty className="text-text-soft text-label-xs py-4">No integrations found.</CommandEmpty>
            <CommandGroup>
              {sortedRows.map((row) => (
                <CommandItem
                  key={row.id}
                  value={`${row.displayName} ${row.integrationIdentifier ?? ''} ${row.providerId}`}
                  onSelect={() => {
                    onSelect(row);
                    setOpen(false);
                  }}
                  className="flex min-w-0 cursor-pointer items-center gap-2 rounded-md p-1"
                >
                  <ProviderIcon
                    providerId={row.providerId}
                    providerDisplayName={row.displayName}
                    className="size-5 shrink-0"
                  />
                  <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                    {row.displayName}
                  </span>
                  {row.integrationIdentifier ? (
                    <span className="text-text-soft text-label-xs shrink-0 truncate font-mono">
                      {row.integrationIdentifier}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
