import { useState } from 'react';
import { RiExpandUpDownLine } from 'react-icons/ri';
import { Badge } from '@/components/primitives/badge';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { CONNECTOR_OPTIONS, type ConnectorId, type ConnectorOption, getConnectorById } from './connector-options';

type ConnectorDropdownProps = {
  selectedId: ConnectorId;
  onSelect: (id: ConnectorId) => void;
  disabled?: boolean;
};

const GROUP_HEADING_CLASSNAME =
  '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

export function ConnectorDropdown({ selectedId, onSelect, disabled }: ConnectorDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = getConnectorById(selectedId);

  const renderItem = (option: ConnectorOption) => {
    const isDisabled = option.comingSoon || !option.runtime;
    const isSelected = selectedId === option.id;

    return (
      <CommandItem
        key={option.id}
        value={`${option.label} ${option.id}`}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        onSelect={() => {
          if (isDisabled) return;
          onSelect(option.id);
          setOpen(false);
        }}
        className={cn(
          'flex min-w-0 items-center gap-2 rounded-md p-1',
          isSelected && 'bg-bg-muted',
          isDisabled && 'pointer-events-auto! opacity-60'
        )}
      >
        <div className="flex w-full min-w-0 items-center gap-1 break-normal">
          {option.icon}
          <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
            {option.label}
          </span>
          {option.comingSoon && (
            <Badge color="gray" variant="lighter">
              coming soon
            </Badge>
          )}
        </div>
      </CommandItem>
    );
  };

  const externalOptions = CONNECTOR_OPTIONS.filter((o) => o.group === 'external');
  const customOptions = CONNECTOR_OPTIONS.filter((o) => o.group === 'custom');

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="border-stroke-soft bg-bg-white flex h-7 w-full items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs disabled:opacity-60"
        >
          {selected ? (
            <div className="flex min-w-0 items-center gap-1">
              {selected.icon}
              <span className="text-text-strong text-label-xs truncate font-medium leading-4">{selected.label}</span>
            </div>
          ) : (
            <span className="text-text-soft text-label-xs font-medium leading-4">Select connector...</span>
          )}
          <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandList className="max-h-[320px] p-1">
            <CommandEmpty className="text-text-soft text-label-xs py-4">No connectors found.</CommandEmpty>

            <CommandGroup heading="External connectors" className={GROUP_HEADING_CLASSNAME}>
              {externalOptions.map(renderItem)}
            </CommandGroup>

            <CommandGroup heading="Custom code" className={GROUP_HEADING_CLASSNAME}>
              {customOptions.map(renderItem)}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
