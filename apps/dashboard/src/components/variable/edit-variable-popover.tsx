import { ReactNode, useState, useCallback, useMemo, useEffect, useId, useRef } from 'react';
import { RiDeleteBin2Line, RiQuestionLine, RiSearchLine } from 'react-icons/ri';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/primitives/command';
import { FormControl, FormItem, FormMessagePure } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { FilterItem } from './components/filter-item';
import { ReorderFiltersGroup } from './components/reorder-filters-group';
import { useFilterManager } from './hooks/use-filter-manager';
import { useSuggestedFilters } from './hooks/use-suggested-filters';
import { useVariableParser } from './hooks/use-variable-parser';
import type { Filters, FilterWithParam } from './types';
import { formatLiquidVariable } from './utils';
import { useDebounce } from '@/hooks/use-debounce';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { Button } from '../primitives/button';

const calculateAliasFor = (name: string, parsedAliasRoot: string): string => {
  const variableRest = name.split('.').slice(1).join('.');
  const normalizedVariableRest = variableRest.startsWith('.') ? variableRest.substring(1) : variableRest;
  let aliasFor =
    parsedAliasRoot && normalizedVariableRest ? `${parsedAliasRoot}.${normalizedVariableRest}` : parsedAliasRoot;

  if (name.trim() === '') {
    aliasFor = '';
  }

  return aliasFor;
};

type EditVariablePopoverProps = {
  variables: LiquidVariable[];
  children: ReactNode;
  open: boolean;
  variable?: LiquidVariable;
  onOpenChange: (open: boolean, newValue: string) => void;
  onUpdate: (newValue: string) => void;
  isAllowedVariable: IsAllowedVariable;
  onDeleteClick: () => void;
};

export const EditVariablePopover = ({
  variables,
  children,
  open,
  onOpenChange,
  variable,
  onUpdate,
  isAllowedVariable,
  onDeleteClick,
}: EditVariablePopoverProps) => {
  const { parsedName, parsedAliasForRoot, parsedDefaultValue, parsedFilters } = useVariableParser(
    variable?.name || '',
    variable?.aliasFor || ''
  );
  const id = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(parsedName);
  const [variableError, setVariableError] = useState<string>(() => {
    if (!variable || !isAllowedVariable({ ...variable, name: parsedName })) {
      return 'Not a valid variable';
    }

    return '';
  });
  const [defaultVal, setDefaultVal] = useState(parsedDefaultValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [filters, setFilters] = useState<FilterWithParam[]>(parsedFilters || []);
  const track = useTelemetry();

  useEffect(() => {
    setName(parsedName);
    setDefaultVal(parsedDefaultValue);
    setFilters(parsedFilters || []);
  }, [parsedName, parsedDefaultValue, parsedFilters]);

  const validateVariable = useCallback(
    (variable: LiquidVariable) => {
      if (!variable || !isAllowedVariable({ ...variable })) {
        setVariableError('Not a valid variable');
        nameInputRef.current?.focus();
        return false;
      }

      setVariableError('');
      return true;
    },
    [isAllowedVariable]
  );

  const validateVariableDebounced = useDebounce(validateVariable, 2000);

  // Set initial test value when popover opens
  const handlePopoverOpen = useCallback(() => {
    track(TelemetryEvent.VARIABLE_POPOVER_OPENED);
  }, [track]);

  const handleNameChange = useCallback(
    (newName: string) => {
      const aliasFor = calculateAliasFor(newName, parsedAliasForRoot);

      setName(newName);
      validateVariableDebounced({ name: newName, aliasFor });
    },
    [setName, validateVariableDebounced, parsedAliasForRoot]
  );

  const handleDefaultValueChange = useCallback(
    (newDefaultVal: string) => {
      setDefaultVal(newDefaultVal);
    },
    [setDefaultVal]
  );

  const { handleReorder, handleFilterToggle, handleParamChange, getFilteredFilters } = useFilterManager({
    initialFilters: filters,
    onUpdate: setFilters,
  });

  const suggestedFilters = useSuggestedFilters(name, filters);
  const filteredFilters = useMemo(() => getFilteredFilters(searchQuery), [getFilteredFilters, searchQuery]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      const aliasFor = calculateAliasFor(name, parsedAliasForRoot);

      if (!open && !validateVariable({ name, aliasFor })) {
        return;
      }

      const newValue = formatLiquidVariable(name, defaultVal, filters);

      if (!open) {
        track(TelemetryEvent.VARIABLE_POPOVER_APPLIED, {
          variableName: name,
          hasDefaultValue: !!defaultVal,
          filtersCount: filters.length,
          filters: filters.map((filter) => filter.value),
        });
        setVariableError('');
        onUpdate(newValue);
      }

      onOpenChange(open, newValue);
    },
    [validateVariable, onOpenChange, name, defaultVal, filters, track, onUpdate, parsedAliasForRoot]
  );

  const handleClosePopover = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  useEscapeKeyManager(id, handleClosePopover, EscapeKeyManagerPriority.POPOVER, open);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="min-w-[275px] max-w-[275px] p-0" align="start" onOpenAutoFocus={handlePopoverOpen}>
        <form
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleOpenChange(false);
          }}
        >
          <div className="bg-bg-weak border-b border-b-neutral-100">
            <div className="flex flex-row items-center justify-between space-y-0 px-1.5 py-1">
              <div className="flex w-full items-center justify-between gap-1">
                <span className="text-subheading-2xs text-text-soft">CONFIGURE VARIABLE</span>
                <Button variant="secondary" mode="ghost" className="h-5 p-1" onClick={onDeleteClick}>
                  <RiDeleteBin2Line className="size-3.5 text-neutral-400" />
                </Button>
              </div>
            </div>
          </div>
          <div className="grid gap-2 p-2">
            <div className="flex flex-col gap-1">
              <FormItem>
                <FormControl>
                  <div className="grid gap-1">
                    <label className="text-text-sub text-label-xs">Variable</label>
                    <Input
                      ref={nameInputRef}
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      autoFocus
                      size="xs"
                      placeholder="Variable name (e.g. payload.name)"
                    />
                    <FormMessagePure hasError={!!variableError}>{variableError}</FormMessagePure>
                  </div>
                </FormControl>
              </FormItem>

              <FormItem>
                <FormControl>
                  <Input
                    value={defaultVal}
                    onChange={(e) => handleDefaultValueChange(e.target.value)}
                    placeholder="Default fallback value"
                    size="xs"
                  />
                </FormControl>
              </FormItem>
            </div>

            <div className="flex flex-col gap-1">
              <FormItem>
                <FormControl>
                  <div className="">
                    <label className="text-text-sub text-label-xs mb-1 flex items-center gap-1">
                      LiquidJS Filters
                      <Tooltip>
                        <TooltipTrigger className="relative cursor-pointer">
                          <RiQuestionLine className="text-text-soft size-4" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-xs">
                          <p className="text-label-xs">
                            LiquidJS filters modify the variable output in sequence, with each filter using the previous
                            one's result. Reorder them by dragging and dropping.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </label>

                    <Popover open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                      <PopoverTrigger asChild>
                        <button className="text-text-soft bg-background flex h-[30px] w-full items-center justify-between rounded-md border px-2 text-xs">
                          <span>Add a filter</span>
                          <RiSearchLine className="h-3 w-3" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent className="min-w-[calc(275px-1rem)] max-w-[calc(275px-1rem)] p-0" align="start">
                        <Command>
                          <div className="p-1">
                            <CommandInput
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                              placeholder="Search..."
                              className="h-7"
                              inputWrapperClassName="h-7 text-2xs"
                            />
                          </div>

                          <CommandList className="max-h-[300px]">
                            <CommandEmpty>No filters found</CommandEmpty>
                            {suggestedFilters.length > 0 && !searchQuery && (
                              <>
                                <CommandGroup heading="Suggested">
                                  {suggestedFilters[0].filters.map((filterItem: Filters) => (
                                    <CommandItem
                                      key={filterItem.value}
                                      onSelect={() => {
                                        handleFilterToggle(filterItem.value);
                                        setSearchQuery('');
                                        setIsCommandOpen(false);
                                      }}
                                    >
                                      <FilterItem filter={filterItem} />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                                {suggestedFilters.length > 0 && <CommandSeparator />}
                              </>
                            )}
                            {filteredFilters.length > 0 && (
                              <CommandGroup>
                                {filteredFilters.map((filter) => (
                                  <CommandItem
                                    key={filter.value}
                                    onSelect={() => {
                                      handleFilterToggle(filter.value);
                                      setSearchQuery('');
                                      setIsCommandOpen(false);
                                    }}
                                  >
                                    <FilterItem filter={filter} />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </FormControl>
              </FormItem>

              <ReorderFiltersGroup
                variables={variables}
                variableName={name}
                filters={filters}
                onReorder={handleReorder}
                onRemove={handleFilterToggle}
                onParamChange={handleParamChange}
              />
            </div>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
