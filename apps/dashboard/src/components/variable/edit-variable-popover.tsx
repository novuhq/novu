import { ReactNode, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  RiArrowRightUpLine,
  RiDeleteBin2Line,
  RiErrorWarningLine,
  RiListView,
  RiQuestionLine,
  RiSearchLine,
} from 'react-icons/ri';
import { LinkButton } from '@/components/primitives/button-link';
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
import { Input, InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/primitives/tooltip';
import type { JSONSchema7 } from '@/components/schema-editor/json-schema';
import { useEscapeKeyManager } from '@/context/escape-key-manager/hooks';
import { EscapeKeyManagerPriority } from '@/context/escape-key-manager/priority';
import { useTelemetry } from '@/hooks/use-telemetry';
import { IsAllowedVariable, LiquidVariable } from '@/utils/parseStepVariables';
import { TelemetryEvent } from '@/utils/telemetry';
import { Code2 } from '../icons/code-2';
import { Button } from '../primitives/button';
import { Separator } from '../primitives/separator';
import { FilterItem } from './components/filter-item';
import { ReorderFiltersGroup } from './components/reorder-filters-group';
import { useFilterManager } from './hooks/use-filter-manager';
import { useSuggestedFilters } from './hooks/use-suggested-filters';
import { useVariableParser } from './hooks/use-variable-parser';
import { useVariableValidation } from './hooks/use-variable-validation';
import type { Filters, FilterWithParam } from './types';
import { formatLiquidVariable } from './utils';

// Helper functions
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
  isPayloadSchemaEnabled: boolean;
  variables: LiquidVariable[];
  children: ReactNode;
  open: boolean;
  variable?: LiquidVariable;
  onOpenChange: (open: boolean, newValue: string) => void;
  onUpdate: (newValue: string) => void;
  isAllowedVariable: IsAllowedVariable;
  onDeleteClick: () => void;
  getSchemaPropertyByKey: (keyPath: string) => JSONSchema7 | undefined;
  onManageSchemaClick?: (variableName: string) => void;
  onAddToSchemaClick?: (variableName: string) => void;
};

export const EditVariablePopover = ({
  isPayloadSchemaEnabled,
  variables,
  children,
  open,
  onOpenChange,
  variable,
  onUpdate,
  isAllowedVariable,
  onDeleteClick,
  getSchemaPropertyByKey,
  onManageSchemaClick,
  onAddToSchemaClick,
}: EditVariablePopoverProps) => {
  const { parsedName, parsedAliasForRoot, parsedDefaultValue, parsedFilters } = useVariableParser(
    variable?.name || '',
    variable?.aliasFor || ''
  );

  const id = useId();
  const nameInputRef = useRef<HTMLInputElement>(null);
  const track = useTelemetry();

  const [name, setName] = useState(parsedName);
  const [defaultVal, setDefaultVal] = useState(parsedDefaultValue);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [filters, setFilters] = useState<FilterWithParam[]>(parsedFilters || []);

  const aliasFor = useMemo(() => calculateAliasFor(name, parsedAliasForRoot), [name, parsedAliasForRoot]);
  const validation = useVariableValidation(
    name,
    aliasFor,
    isAllowedVariable,
    getSchemaPropertyByKey,
    isPayloadSchemaEnabled
  );

  useEffect(() => {
    setName(parsedName);
    setDefaultVal(parsedDefaultValue);
    setFilters(parsedFilters || []);
  }, [parsedName, parsedDefaultValue, parsedFilters]);

  const handlePopoverOpen = useCallback(() => {
    track(TelemetryEvent.VARIABLE_POPOVER_OPENED);
  }, [track]);

  const handleNameChange = useCallback((newName: string) => {
    setName(newName);
  }, []);

  const handleDefaultValueChange = useCallback((newDefaultVal: string) => {
    setDefaultVal(newDefaultVal);
  }, []);

  const { handleReorder, handleFilterToggle, handleParamChange, getFilteredFilters } = useFilterManager({
    initialFilters: filters,
    onUpdate: setFilters,
  });

  const suggestedFilters = useSuggestedFilters(name, filters);
  const filteredFilters = useMemo(() => getFilteredFilters(searchQuery), [getFilteredFilters, searchQuery]);

  const handleOpenChange = useCallback(
    (open: boolean) => {
      const newValue = formatLiquidVariable(name, defaultVal, filters);

      if (!open) {
        track(TelemetryEvent.VARIABLE_POPOVER_APPLIED, {
          variableName: name,
          hasDefaultValue: !!defaultVal,
          filtersCount: filters.length,
          filters: filters.map((filter) => filter.value),
        });
        onUpdate(newValue);
      }

      onOpenChange(open, newValue);
    },
    [onOpenChange, name, defaultVal, filters, track, onUpdate]
  );

  const handleClosePopover = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const handleManageSchema = useCallback(() => {
    if (onManageSchemaClick && name) {
      onManageSchemaClick(validation.variableKey);
    }
  }, [onManageSchemaClick, name, validation.variableKey]);

  const handleAddToSchema = useCallback(() => {
    if (onAddToSchemaClick && name) {
      onAddToSchemaClick(validation.variableKey);
      handleOpenChange(false);
    }
  }, [onAddToSchemaClick, name, validation.variableKey, handleOpenChange]);

  useEscapeKeyManager(id, handleClosePopover, EscapeKeyManagerPriority.POPOVER, open);

  const showManageSchemaButton = isPayloadSchemaEnabled && validation.isPayloadVariable && validation.isInSchema;
  const showAddToSchemaButton = isPayloadSchemaEnabled && validation.isPayloadVariable && !validation.isInSchema;
  const showVariableTypeInput = isPayloadSchemaEnabled && validation.isPayloadVariable;
  const variableType = validation.schemaProperty?.type || 'unknown';

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent
        className="min-w-[275px] max-w-[275px] overflow-x-hidden p-0"
        align="start"
        side="bottom"
        updatePositionStrategy="optimized"
        onOpenAutoFocus={handlePopoverOpen}
      >
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
                  <div className="grid">
                    <div className="mb-1 flex w-full flex-row items-center justify-between gap-1">
                      <label className="text-text-sub text-label-xs items-start">Variable</label>
                      {showManageSchemaButton && (
                        <LinkButton
                          variant="gray"
                          size="sm"
                          className="text-label-2xs text-xs"
                          leadingIcon={RiListView}
                          onClick={handleManageSchema}
                        >
                          Manage schema ↗
                        </LinkButton>
                      )}
                    </div>

                    <InputRoot size="2xs" hasError={validation.hasError}>
                      <InputWrapper>
                        <Code2 className="h-4 w-4 shrink-0 text-gray-500" />
                        <InputPure
                          ref={nameInputRef}
                          value={name}
                          onChange={(e) => handleNameChange(e.target.value)}
                          autoFocus
                          className="text-xs"
                          placeholder="Variable name (e.g. payload.name)"
                        />
                      </InputWrapper>
                    </InputRoot>
                    {validation.hasError && !showAddToSchemaButton && (
                      <FormMessagePure hasError={true}>{validation.errorMessage}</FormMessagePure>
                    )}

                    {validation.hasError && showAddToSchemaButton && (
                      <FormMessagePure hasError={true} className="text-label-2xs mb-0.5 mt-0.5">
                        <RiErrorWarningLine className="h-3 w-3" />
                        Variable missing from Schema{' '}
                        <LinkButton
                          variant="modifiable"
                          size="sm"
                          className="text-label-2xs"
                          onClick={handleAddToSchema}
                        >
                          <span className="underline"> Add to schema ↗</span>
                        </LinkButton>
                      </FormMessagePure>
                    )}
                  </div>
                </FormControl>
              </FormItem>

              {!isPayloadSchemaEnabled && (
                <FormItem>
                  <FormControl>
                    <Input
                      value={defaultVal}
                      onChange={(e) => handleDefaultValueChange(e.target.value)}
                      placeholder="Default fallback value"
                      size="2xs"
                    />
                  </FormControl>
                </FormItem>
              )}

              {showVariableTypeInput && (
                <FormItem>
                  <FormControl>
                    <Input value={variableType.toString()} disabled placeholder="Variable type" size="2xs" />
                  </FormControl>
                </FormItem>
              )}

              {showVariableTypeInput && isPayloadSchemaEnabled && (
                <div className="text-label-2xs text-text-soft items-center gap-1.5 px-1 py-0.5 font-medium">
                  💡 <b className="text-text-sub font-medium">Tip:</b> Edit variable type, mark as required field, and
                  add validation via{' '}
                  <LinkButton
                    variant="gray"
                    size="sm"
                    className="text-text-sub text-label-2xs font-medium"
                    onClick={handleManageSchema}
                    trailingIcon={RiArrowRightUpLine}
                  >
                    Manage schema
                  </LinkButton>
                </div>
              )}
            </div>

            <Separator className="ml-[-10px] mr-[-10px] w-[calc(100%+20px)]" />

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
