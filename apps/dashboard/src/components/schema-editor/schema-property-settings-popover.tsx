import { forwardRef, useState } from 'react';
import { Controller, type Path, useFormContext } from 'react-hook-form';
import { RiDeleteBin2Line } from 'react-icons/ri';
import { Button } from '@/components/primitives/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { Input, InputPure, InputRoot, InputWrapper } from '@/components/primitives/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/primitives/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/primitives/select';
import { Switch } from '@/components/primitives/switch';
import { cn } from '@/utils/ui';
import { Code2 } from '../icons/code-2';
import { Separator } from '../primitives/separator';
import { useSchemaPropertyType } from './hooks/use-schema-property-type';
import type { JSONSchema7, JSONSchema7TypeName } from './json-schema';
import type { VariableUsageInfo } from './utils/check-variable-usage';
import type { SchemaEditorFormValues } from './utils/validation-schema';

interface SchemaPropertySettingsPopoverProps {
  definitionPath: string;
  propertyKeyForDisplay: string;
  isRequiredPath: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleteProperty: () => void;
  variableUsageInfo?: VariableUsageInfo;
}

function parseDefaultValue(value: string | undefined, type: JSONSchema7TypeName | 'enum' | undefined) {
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

    const currentDefinition = watch(definitionPath as Path<SchemaEditorFormValues>) as JSONSchema7 | undefined;
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
    const propertyNamePath = `${definitionPath.replace(/\.properties\.[^.]+$/, '')}.propertyName`;

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
      <PopoverContent ref={ref} className="w-[320px] p-0" sideOffset={5} portal={false}>
        <div className="bg-bg-weak border-b border-b-neutral-100">
          <div className="flex flex-row items-center justify-between space-y-0 px-1.5 py-1">
            <div className="flex w-full items-center justify-between gap-1">
              <span className="text-subheading-2xs text-text-soft">SCHEMA CONFIGURATION</span>
              {isVariableInUse ? (
                <Popover open={showUsagePopover} onOpenChange={setShowUsagePopover} modal={false}>
                  <PopoverTrigger asChild>{deleteButton}</PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    className="max-w-xs"
                    onMouseEnter={() => setShowUsagePopover(true)}
                    onMouseLeave={() => setShowUsagePopover(false)}
                    portal={false}
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
          <div className="text-text-sub space-y-1 overflow-y-auto p-2">
            <FormItem>
              <FormLabel className="text-xs">Property Name</FormLabel>
              <Controller
                name={propertyNamePath as Path<SchemaEditorFormValues>}
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl>
                    <InputRoot hasError={!!fieldState.error} size="2xs" className={cn('font-mono')}>
                      <InputWrapper>
                        <Code2 className="h-4 w-4 shrink-0 text-gray-500" />
                        <InputPure
                          {...field}
                          value={
                            field.value === undefined || field.value === null
                              ? propertyKeyForDisplay
                              : String(field.value)
                          }
                          onChange={(e) => {
                            field.onChange(e.target.value);
                          }}
                          placeholder="Enter property name"
                          className="text-xs"
                        />
                      </InputWrapper>
                    </InputRoot>
                  </FormControl>
                )}
              />
              <FormMessage />
            </FormItem>

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
          </div>
          <Separator />

          <div className="text-text-sub space-y-1 p-2">
            {(isStringType || isArrayType) && (
              <>
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
          <div className="flex justify-end px-2 py-1.5">
            <Button
              type="button"
              size="2xs"
              className="h-6"
              mode="filled"
              variant="secondary"
              onClick={handleApplyChanges}
            >
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    );
  }
);

SchemaPropertySettingsPopover.displayName = 'SchemaPropertySettingsPopover';
