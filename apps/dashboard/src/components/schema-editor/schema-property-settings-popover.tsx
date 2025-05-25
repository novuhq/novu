import { forwardRef, useEffect, useMemo, useState } from 'react';
import { useFormContext, Controller, type Path } from 'react-hook-form';

import { Button } from '@/components/primitives/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input } from '@/components/primitives/input';
import { PopoverContent, Popover, PopoverTrigger } from '@/components/primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { Textarea } from '@/components/primitives/textarea';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { Separator } from '../primitives/separator';
import type { JSONSchema7, JSONSchema7TypeName } from './json-schema';
import type { SchemaEditorFormValues } from './utils/validation-schema';
import { useSchemaPropertyType } from './hooks/use-schema-property-type';
import type { VariableUsageInfo } from './utils/check-variable-usage';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

interface SchemaPropertySettingsPopoverProps {
  definitionPath: string;
  propertyKeyForDisplay: string;
  isRequiredPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteProperty: () => void;
  variableUsageInfo?: VariableUsageInfo;
}

function parseDefaultValue(value: string | undefined, type: JSONSchema7TypeName | 'enum' | undefined): any {
  if (value === undefined || value === null || value.trim() === '') {
    return undefined;
  }

  const lowerValue = value.toLowerCase();

  switch (type) {
    case 'integer': {
      const intValue = parseInt(value, 10);
      return Number.isNaN(intValue) ? value : intValue;
    }

    case 'number': {
      const floatValue = parseFloat(value);
      return Number.isNaN(floatValue) ? value : floatValue;
    }

    case 'boolean':
      if (lowerValue === 'true') return true;
      if (lowerValue === 'false') return false;
      return value;
    case 'null':
      return lowerValue === 'null' ? null : value;
    case 'string':
    default:
      return value;
  }
}

const NONE_FORMAT_VALUE = '_NONE_';

const JSON_SCHEMA_FORMATS = [
  NONE_FORMAT_VALUE,
  'date-time',
  'date',
  'time',
  'duration',
  'email',
  'hostname',
  'ipv4',
  'ipv6',
  'uuid',
  'uri',
  'uri-reference',
  'uri-template',
  'json-pointer',
  'relative-json-pointer',
  'regex',
];

export const SchemaPropertySettingsPopover = forwardRef<HTMLDivElement, SchemaPropertySettingsPopoverProps>(
  (props, ref) => {
    const {
      definitionPath,
      propertyKeyForDisplay,
      isRequiredPath,
      open,
      onOpenChange,
      onDeleteProperty,
      variableUsageInfo,
    } = props;

    const { control, watch } = useFormContext<SchemaEditorFormValues>();
    const [showUsagePopover, setShowUsagePopover] = useState(false);

    const currentDefinition = watch(definitionPath as any) as JSONSchema7 | undefined;
    const currentType = useSchemaPropertyType(currentDefinition);

    const handleApplyChanges = () => {
      onOpenChange(false);
    };

    const handleDelete = () => {
      onDeleteProperty();
      onOpenChange(false);
    };

    const handleDeleteClick = () => {
      if (!isVariableInUse) {
        handleDelete();
      } else {
        // Keep popover open when clicked
        setShowUsagePopover(true);
      }
    };

    const handleMouseEnter = () => {
      if (isVariableInUse) {
        setShowUsagePopover(true);
      }
    };

    const handleMouseLeave = () => {
      // Small delay to prevent flickering when moving between button and popover
      setTimeout(() => {
        setShowUsagePopover(false);
      }, 100);
    };

    const effectiveType = currentType;
    const isStringType = effectiveType === 'string';
    const isArrayType = effectiveType === 'array';
    const isNumericType = effectiveType === 'integer' || effectiveType === 'number';

    const isVariableInUse = variableUsageInfo?.isUsed || false;

    const defaultValuePath = `${definitionPath}.default`;
    const formatPath = `${definitionPath}.format`;
    const patternPath = `${definitionPath}.pattern`;
    const minLengthPath = `${definitionPath}.minLength`;
    const maxLengthPath = `${definitionPath}.maxLength`;
    const minimumPath = `${definitionPath}.minimum`;
    const maximumPath = `${definitionPath}.maximum`;
    const minItemsPath = `${definitionPath}.minItems`;
    const maxItemsPath = `${definitionPath}.maxItems`;

    if (!open) return null;

    const deleteButton = (
      <Button
        variant="secondary"
        mode="ghost"
        className={cn('h-5 p-1', isVariableInUse && 'cursor-not-allowed opacity-50')}
        onClick={handleDeleteClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        aria-disabled={isVariableInUse}
      >
        <RiDeleteBin2Line className="size-3.5 text-neutral-400" />
      </Button>
    );

    return (
      <PopoverContent ref={ref} className="w-[320px] p-0" sideOffset={5}>
        <div className="bg-bg-weak border-b border-b-neutral-100">
          <div className="flex flex-row items-center justify-between space-y-0 px-1.5 py-1">
            <div className="flex w-full items-center justify-between gap-1">
              <span className="text-subheading-2xs text-text-soft">
                {propertyKeyForDisplay ? `${propertyKeyForDisplay} - ` : ''} Settings
              </span>
              {isVariableInUse ? (
                <Popover open={showUsagePopover} onOpenChange={setShowUsagePopover}>
                  <PopoverTrigger asChild>{deleteButton}</PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    className="max-w-xs"
                    onMouseEnter={() => setShowUsagePopover(true)}
                    onMouseLeave={() => setShowUsagePopover(false)}
                  >
                    <div className="space-y-2">
                      <p className="font-medium">Variable in use</p>
                      <p className="text-xs">
                        This variable can't be deleted as it's being used in the step content of this workflow.
                      </p>
                      {variableUsageInfo && variableUsageInfo.usedInSteps.length > 0 && (
                        <div className="text-xs">
                          <p className="mb-1 font-medium">Used in:</p>
                          <ul className="list-inside list-disc space-y-0.5">
                            {variableUsageInfo.usedInSteps.map((step) => (
                              <li key={step.stepId}>{step.stepName}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                deleteButton
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col">
          <div className="max-h-[450px] space-y-2.5 overflow-y-auto p-3">
            <FormItem>
              <FormLabel className="text-xs">Default Value</FormLabel>
              <Controller
                name={defaultValuePath as Path<SchemaEditorFormValues>}
                control={control}
                render={({ field }) => (
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value === undefined || field.value === null ? '' : String(field.value)}
                      onChange={(e) => {
                        const parsed = parseDefaultValue(e.target.value, currentType);
                        field.onChange(parsed);
                      }}
                      placeholder={`Enter default (${String(effectiveType)})`}
                      size="2xs"
                    />
                  </FormControl>
                )}
              />
              <FormMessage />
            </FormItem>

            <FormItem className="flex flex-row items-center justify-between">
              <FormLabel className="text-xs">Required</FormLabel>
              <Controller
                name={isRequiredPath as Path<SchemaEditorFormValues>}
                control={control}
                render={({ field }) => (
                  <FormControl>
                    <Switch className="mt-0" checked={!!field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                )}
              />
            </FormItem>

            <Separator />

            {(isStringType || isArrayType) && (
              <>
                <FormLabel className="mb-1 block text-xs">
                  {isArrayType ? 'Array Constraints' : 'String Constraints'}
                </FormLabel>
                <div className="grid grid-cols-2 gap-2.5">
                  <FormItem>
                    <FormLabel className="text-xs font-normal">{isArrayType ? 'Min Items' : 'Min Length'}</FormLabel>
                    <Controller
                      name={(isArrayType ? minItemsPath : minLengthPath) as Path<SchemaEditorFormValues>}
                      control={control}
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={typeof field.value === 'number' ? field.value : ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))
                            }
                            placeholder="e.g., 0"
                            size="2xs"
                          />
                        </FormControl>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                  <FormItem>
                    <FormLabel className="text-xs font-normal">{isArrayType ? 'Max Items' : 'Max Length'}</FormLabel>
                    <Controller
                      name={(isArrayType ? maxItemsPath : maxLengthPath) as Path<SchemaEditorFormValues>}
                      control={control}
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={typeof field.value === 'number' ? field.value : ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? undefined : parseInt(e.target.value, 10))
                            }
                            placeholder="e.g., 100"
                            size="2xs"
                          />
                        </FormControl>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                </div>
              </>
            )}

            {isStringType && (
              <>
                <FormItem>
                  <FormLabel className="text-xs">Format</FormLabel>
                  <Controller
                    name={formatPath as Path<SchemaEditorFormValues>}
                    control={control}
                    render={({ field }) => (
                      <FormControl>
                        <Select
                          value={
                            field.value === undefined || field.value === null ? NONE_FORMAT_VALUE : String(field.value)
                          }
                          onValueChange={(value) => field.onChange(value === NONE_FORMAT_VALUE ? undefined : value)}
                        >
                          <SelectTrigger size="2xs" className="w-full text-sm">
                            <SelectValue placeholder="Select a format" />
                          </SelectTrigger>
                          <SelectContent>
                            {JSON_SCHEMA_FORMATS.map((formatVal) => (
                              <SelectItem key={formatVal} value={formatVal}>
                                {formatVal === NONE_FORMAT_VALUE ? 'None' : formatVal}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                    )}
                  />
                  <FormMessage />
                </FormItem>
                <FormItem>
                  <FormLabel className="text-xs">Pattern (Regex)</FormLabel>
                  <Controller
                    name={patternPath as Path<SchemaEditorFormValues>}
                    control={control}
                    render={({ field }) => (
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value === undefined || field.value === null ? '' : String(field.value)}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.value)}
                          placeholder="^\\d{3}$"
                          size="2xs"
                        />
                      </FormControl>
                    )}
                  />
                  <FormMessage />
                </FormItem>
              </>
            )}

            {isNumericType && (
              <>
                <FormLabel className="mb-1 block text-xs">Numeric Constraints</FormLabel>
                <div className="grid grid-cols-2 gap-2.5">
                  <FormItem>
                    <FormLabel className="text-xs font-normal">Minimum</FormLabel>
                    <Controller
                      name={minimumPath as Path<SchemaEditorFormValues>}
                      control={control}
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={typeof field.value === 'number' ? field.value : ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                            }
                            placeholder="e.g., 0"
                            size="2xs"
                          />
                        </FormControl>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                  <FormItem>
                    <FormLabel className="text-xs font-normal">Maximum</FormLabel>
                    <Controller
                      name={maximumPath as Path<SchemaEditorFormValues>}
                      control={control}
                      render={({ field }) => (
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            value={typeof field.value === 'number' ? field.value : ''}
                            onChange={(e) =>
                              field.onChange(e.target.value === '' ? undefined : parseFloat(e.target.value))
                            }
                            placeholder="e.g., 100"
                            size="2xs"
                          />
                        </FormControl>
                      )}
                    />
                    <FormMessage />
                  </FormItem>
                </div>
              </>
            )}
          </div>
          <Separator />
          <div className="flex justify-end px-3 py-2">
            <Button type="button" size="2xs" mode="filled" variant="secondary" onClick={handleApplyChanges}>
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    );
  }
);

SchemaPropertySettingsPopover.displayName = 'SchemaPropertySettingsPopover';
