import { Button } from '@/components/primitives/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/primitives/command';
import { FormControl, FormItem } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Switch } from '@/components/primitives/switch';
import { useTelemetry } from '@/hooks/use-telemetry';
import { TelemetryEvent } from '@/utils/telemetry';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RiAddFill, RiQuestionLine } from 'react-icons/ri';
import { Separator } from '@/components/primitives/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import { FilterItem } from './components/filter-item';
import { FilterPreview } from './components/filter-preview';
import { ReorderFiltersGroup } from './components/reorder-filters-group';
import { useFilterManager } from './hooks/use-filter-manager';
import { useSuggestedFilters } from './hooks/use-suggested-filters';
import { useVariableParser } from './hooks/use-variable-parser';
import type { Filters, FilterWithParam, VariablePopoverProps } from './types';
import { formatLiquidVariable, getDefaultSampleValue } from './utils';

export function EditVariablePopoverContent({ variable, onUpdate, onEscapeKeyDown }: VariablePopoverProps) {
  const { parsedName, parsedDefaultValue, parsedFilters, originalVariable, parseRawInput } = useVariableParser(
    variable || ''
  );
  const [name, setName] = useState(parsedName);
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

  // Set initial test value when popover opens
  const handlePopoverOpen = useCallback(() => {
    track(TelemetryEvent.VARIABLE_POPOVER_OPENED);

    // Set a default test value based on the first filter, if any
    if (filters.length > 0) {
      const firstFilter = filters[0];
      const sampleValue = getDefaultSampleValue(firstFilter.value);

      if (sampleValue) {
        setPreviewValue(sampleValue);
      }
    } else {
      // Default to a simple string if no filters
      setPreviewValue('Hello World');
    }
  }, [filters, track]);

  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
  }, []);

  const handleDefaultValueChange = useCallback((newDefaultVal: string) => {
    setDefaultVal(newDefaultVal);
  }, []);

  const handleRawLiquidChange = useCallback(
    (value: string) => {
      const { parsedName, parsedDefaultValue } = parseRawInput(value);
      setName(parsedName);
      setDefaultVal(parsedDefaultValue);
    },
    [parseRawInput]
  );

  const { handleReorder, handleFilterToggle, handleParamChange, getFilteredFilters } = useFilterManager({
    initialFilters: filters,
    onUpdate: setFilters,
  });

  const suggestedFilters = useSuggestedFilters(name, filters);
  const filteredFilters = useMemo(() => getFilteredFilters(searchQuery), [getFilteredFilters, searchQuery]);

  const currentLiquidValue = useMemo(
    () => originalVariable || formatLiquidVariable(name, defaultVal, filters),
    [originalVariable, name, defaultVal, filters]
  );

  const handleSave = useCallback(() => {
    track(TelemetryEvent.VARIABLE_POPOVER_APPLIED, {
      variableName: name,
      hasDefaultValue: !!defaultVal,
      filtersCount: filters.length,
      filters: filters.map((filter) => filter.value),
    });
    onUpdate(formatLiquidVariable(name, defaultVal, filters));
  }, [name, defaultVal, filters, onUpdate, track]);

  return (
    <PopoverContent className="w-72 p-0" onOpenAutoFocus={handlePopoverOpen} onEscapeKeyDown={onEscapeKeyDown}>
      <div className="bg-bg-weak">
        <div className="flex flex-row items-center justify-between space-y-0 p-1.5">
          <div className="flex items-center gap-1">
            <span className="font-subheading-2x-small text-subheading-2xs text-text-soft">CONFIGURE VARIABLE</span>
          </div>
        </div>
      </div>
      <div className="grid">
        <div className="grid gap-2 p-2">
          <FormItem>
            <FormControl>
              <div className="grid gap-1">
                <label className="text-text-sub text-label-xs">Variable name</label>
                <Input value={name} onChange={(e) => handleNameChange(e.target.value)} className="h-7 text-sm" />
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
              <div className="grid gap-1">
                <label className="text-text-sub text-label-xs">
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
                                  const sampleValue = getDefaultSampleValue(filter.value);

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
        <Separator className="my-0" />

        <div className="flex justify-end p-2">
          <Button variant="secondary" mode="filled" size="2xs" onClick={handleSave} className="h-6">
            Apply
          </Button>
        </div>
      </div>
    </PopoverContent>
  );
}
