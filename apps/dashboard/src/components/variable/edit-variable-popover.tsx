import { ReactNode, useState, useCallback, useMemo, useEffect, useId, useRef } from 'react';
import { RiAddFill, RiQuestionLine } from 'react-icons/ri';
import { FeatureFlagsKeysEnum } from '@novu/shared';

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
import { Switch } from '@/components/primitives/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { FilterItem } from './components/filter-item';
import { FilterPreview } from './components/filter-preview';
import { ReorderFiltersGroup } from './components/reorder-filters-group';
import { useFilterManager } from './hooks/use-filter-manager';
import { useSuggestedFilters } from './hooks/use-suggested-filters';
import { useVariableParser } from './hooks/use-variable-parser';
import type { Filters, FilterWithParam } from './types';
import { formatLiquidVariable, getDefaultSampleValue } from './utils';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useDebounce } from '@/hooks/use-debounce';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';

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
  children: ReactNode;
  open: boolean;
  variable?: LiquidVariable;
  onOpenChange: (open: boolean, newValue: string) => void;
  onUpdate: (newValue: string) => void;
  isAllowedVariable: IsAllowedVariable;
};

export const EditVariablePopover = ({
  children,
  open,
  onOpenChange,
  variable,
  onUpdate,
  isAllowedVariable,
}: EditVariablePopoverProps) => {
  const isEnhancedDigestEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_ENHANCED_DIGEST_ENABLED);
  const { parsedName, parsedAliasForRoot, parsedDefaultValue, parsedFilters, originalVariable, parseRawInput } =
    useVariableParser(variable?.name || '', variable?.aliasFor || '');
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
  const [previewValue, setPreviewValue] = useState('');
  const [showRawLiquid, setShowRawLiquid] = useState(false);
  const [showTestValue, setShowTestValue] = useState(false);
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

    // Set a default test value based on the first filter, if any
    if (filters.length > 0) {
      const firstFilter = filters[0];
      const sampleValue = getDefaultSampleValue(firstFilter.value, isEnhancedDigestEnabled);

      if (sampleValue) {
        setPreviewValue(sampleValue);
      }
    } else {
      // Default to a simple string if no filters
      setPreviewValue('Hello World');
    }
  }, [filters, track, isEnhancedDigestEnabled]);

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

  const handleRawLiquidChange = useCallback(
    (value: string) => {
      const { parsedName, parsedDefaultValue } = parseRawInput(value);
      setName(parsedName);
      setDefaultVal(parsedDefaultValue);
    },
    [parseRawInput, setName, setDefaultVal]
  );

  const { handleReorder, handleFilterToggle, handleParamChange, getFilteredFilters } = useFilterManager({
    initialFilters: filters,
    onUpdate: setFilters,
  });

  const suggestedFilters = useSuggestedFilters(name, filters);
  const filteredFilters = useMemo(() => getFilteredFilters(searchQuery), [getFilteredFilters, searchQuery]);

  const currentLiquidValue = useMemo(
    () => originalVariable || formatLiquidVariable(name, defaultVal, filters, isEnhancedDigestEnabled),
    [originalVariable, name, defaultVal, filters, isEnhancedDigestEnabled]
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      const aliasFor = calculateAliasFor(name, parsedAliasForRoot);

      if (!open && !validateVariable({ name, aliasFor })) {
        return;
      }

      const newValue = formatLiquidVariable(name, defaultVal, filters, isEnhancedDigestEnabled);

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
    [
      validateVariable,
      onOpenChange,
      name,
      defaultVal,
      filters,
      track,
      onUpdate,
      isEnhancedDigestEnabled,
      parsedAliasForRoot,
    ]
  );

  const handleClosePopover = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  useEscapeKeyManager(id, handleClosePopover, EscapeKeyManagerPriority.POPOVER, open);

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start" onOpenAutoFocus={handlePopoverOpen}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleOpenChange(false);
          }}
        >
          <div className="bg-bg-weak">
            <div className="flex flex-row items-center justify-between space-y-0 p-1.5">
              <div className="flex items-center gap-1">
                <span className="font-subheading-2x-small text-subheading-2xs text-text-soft">CONFIGURE VARIABLE</span>
              </div>
            </div>
          </div>
          <div className="grid gap-2 p-2">
            <FormItem>
              <FormControl>
                <div className="grid gap-1">
                  <label className="text-text-sub text-label-xs">Variable name</label>
                  <Input
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <FormMessagePure hasError={!!variableError}>{variableError}</FormMessagePure>
                </div>
              </FormControl>
            </FormItem>

            <FormItem>
              <FormControl>
                <div className="grid gap-1">
                  <label className="text-text-sub text-label-xs">Default value</label>
                  <Input
                    value={defaultVal}
                    onChange={(e) => handleDefaultValueChange(e.target.value)}
                    className="h-7 text-sm"
                  />
                </div>
              </FormControl>
            </FormItem>

            <FormItem>
              <FormControl>
                <div className="">
                  <label className="text-text-sub text-label-xs inline">
                    LiquidJS Filters
                    <Tooltip>
                      <TooltipTrigger className="relative top-0.5 ml-1 cursor-pointer">
                        <RiQuestionLine className="text-text-soft h-3 w-3" />
                      </TooltipTrigger>
                      <TooltipContent side="right" className="max-w-sm">
                        <p>
                          LiquidJS filters modify the variable output in sequence, with each filter using the previous
                          one's result. Reorder them by dragging and dropping.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </label>

                  <Popover open={isCommandOpen} onOpenChange={setIsCommandOpen}>
                    <PopoverTrigger asChild>
                      <button className="text-text-soft bg-background flex h-[30px] w-full items-center justify-between rounded-md border px-2 text-sm">
                        <span>Add a filter...</span>
                        <RiAddFill className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-0" align="start">
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
                                    const sampleValue = getDefaultSampleValue(filter.value, isEnhancedDigestEnabled);

                                    if (sampleValue) {
                                      setPreviewValue(sampleValue);
                                    }
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
              filters={filters}
              onReorder={handleReorder}
              onRemove={handleFilterToggle}
              onParamChange={handleParamChange}
            />

            {filters.length > 0 && (
              <FormItem>
                <FormControl>
                  <div className="flex items-center justify-between">
                    <label className="text-text-sub text-label-xs">Show test value</label>
                    <Switch checked={showTestValue} onCheckedChange={setShowTestValue} className="scale-75" />
                  </div>
                </FormControl>
              </FormItem>
            )}

            {filters.length > 0 && showTestValue && (
              <FormItem>
                <FormControl>
                  <div className="grid gap-1">
                    <Input
                      value={previewValue}
                      onChange={(e) => setPreviewValue(e.target.value)}
                      placeholder='Enter value (e.g. "text" or [1,2,3] or {"key":"value"})'
                      className="h-7 text-sm"
                    />
                  </div>
                </FormControl>
                {previewValue && (
                  <div className="mt-1">
                    <FilterPreview value={previewValue} filters={filters} />
                  </div>
                )}
              </FormItem>
            )}

            <FormItem>
              <FormControl>
                <div className="flex items-center justify-between">
                  <label className="text-text-sub text-label-xs">Show raw LiquidJS</label>
                  <Switch checked={showRawLiquid} onCheckedChange={setShowRawLiquid} className="scale-75" />
                </div>
              </FormControl>
            </FormItem>
            {showRawLiquid && (
              <FormItem>
                <FormControl>
                  <div className="grid gap-1">
                    <Input
                      value={currentLiquidValue}
                      onChange={(e) => handleRawLiquidChange(e.target.value)}
                      className="h-7 text-sm"
                    />
                  </div>
                </FormControl>
              </FormItem>
            )}
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
