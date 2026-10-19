import { useState } from 'react';
import { RiExpandUpDownLine, RiFileCodeLine } from 'react-icons/ri';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/primitives/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { cn } from '@/utils/ui';
import { AGENT_TEMPLATES, type AgentTemplate } from '../../agents/create-agent-fields';
import { BotIcon } from '../../icons/bot';

export type TemplateSelection =
  | { kind: 'template'; template: AgentTemplate }
  | { kind: 'scratch' }
  | { kind: 'existing' };

type TemplateDropdownProps = {
  selection: TemplateSelection;
  onSelect: (selection: TemplateSelection) => void;
  /** Show the "Use an existing agent" option (managed runtimes only). */
  showExistingOption: boolean;
  existingOptionIcon?: React.ReactNode;
  disabled?: boolean;
};

const GROUP_HEADING_CLASSNAME =
  '**:[[cmdk-group-heading]]:text-text-soft **:[[cmdk-group-heading]]:text-label-xs **:[[cmdk-group-heading]]:font-medium **:[[cmdk-group-heading]]:leading-4 **:[[cmdk-group-heading]]:px-1 **:[[cmdk-group-heading]]:py-1';

function getTriggerLabel(selection: TemplateSelection): string {
  if (selection.kind === 'template') return selection.template.name;
  if (selection.kind === 'existing') return 'Use an existing agent';

  return 'Start from scratch';
}

export function TemplateDropdown({
  selection,
  onSelect,
  showExistingOption,
  existingOptionIcon,
  disabled,
}: TemplateDropdownProps) {
  const [open, setOpen] = useState(false);
  const triggerLabel = getTriggerLabel(selection);

  const handleSelect = (next: TemplateSelection) => {
    onSelect(next);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className="border-stroke-soft bg-bg-white flex h-7 w-full items-center justify-between overflow-hidden rounded-md border px-1.5 py-1 shadow-xs disabled:opacity-60"
        >
          <div className="flex min-w-0 items-center gap-1">
            <BotIcon className="text-feature size-4 shrink-0" />
            <span className="text-text-strong text-label-xs truncate font-medium leading-4">{triggerLabel}</span>
          </div>
          <RiExpandUpDownLine className="text-text-soft size-3 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[320px] p-0">
        <Command>
          <CommandList className="max-h-[320px] p-1">
            <CommandEmpty className="text-text-soft text-label-xs py-4">No templates found.</CommandEmpty>

            <CommandGroup className={GROUP_HEADING_CLASSNAME}>
              {AGENT_TEMPLATES.map((template) => {
                const isSelected = selection.kind === 'template' && selection.template.label === template.label;

                return (
                  <CommandItem
                    key={template.label}
                    value={`${template.label} ${template.name}`}
                    onSelect={() => handleSelect({ kind: 'template', template })}
                    className={cn('flex items-center gap-2 rounded-md p-1', isSelected && 'bg-bg-muted')}
                  >
                    <div className="flex w-full min-w-0 items-center gap-1">
                      <BotIcon className="text-feature size-4 shrink-0" />
                      <span className="text-text-sub text-label-xs min-w-0 flex-1 truncate font-medium leading-4">
                        {template.name}
                      </span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandSeparator className="bg-stroke-soft my-1" />

            <CommandGroup className={GROUP_HEADING_CLASSNAME}>
              <CommandItem
                value="start-from-scratch"
                onSelect={() => handleSelect({ kind: 'scratch' })}
                className={cn('flex items-center gap-1 rounded-md p-1', selection.kind === 'scratch' && 'bg-bg-muted')}
              >
                <RiFileCodeLine className="size-4 text-icon-sub" />
                <span className="text-text-sub text-label-xs font-medium leading-4">Start from scratch</span>
              </CommandItem>

              {showExistingOption && (
                <CommandItem
                  value="use-an-existing-agent"
                  onSelect={() => handleSelect({ kind: 'existing' })}
                  className={cn(
                    'flex items-center gap-1 rounded-md p-1',
                    selection.kind === 'existing' && 'bg-bg-muted'
                  )}
                >
                  {existingOptionIcon}
                  <span className="text-text-sub text-label-xs font-medium leading-4">Use an existing agent</span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
