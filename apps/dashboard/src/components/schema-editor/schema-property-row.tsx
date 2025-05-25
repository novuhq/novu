import { useCallback } from 'react';
import { Controller, useFieldArray, useFormContext, useWatch, type Control } from 'react-hook-form';
import { RiAddLine, RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/primitives/button';
import { InputPure, InputRoot } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { cn } from '@/utils/ui';

import type { JSONSchema7 } from './json-schema';
import { newProperty } from './utils/json-helpers';
import { getMarginClassPx } from './utils/ui-helpers';

import { PropertyNameInput } from './components/property-name-input';
import { PropertyTypeSelector } from './components/property-type-selector';

import { Checkbox } from '@/components/primitives/checkbox';
import { Label } from '@/components/primitives/label';

import type { PropertyListItem } from './utils/validation-schema';
import { useSchemaPropertyType } from './hooks/use-schema-property-type';
import { PropertyActions } from './components/property-actions';
import type { VariableUsageInfo } from './utils/check-variable-usage';

export interface SchemaPropertyRowProps {
  control: Control<any>;
  index: number;
  pathPrefix: string;
  onDeleteProperty: () => void;
  indentationLevel?: number;
  highlightedPropertyKey?: string | null;
  variableUsageInfo?: VariableUsageInfo;
  parentPath?: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

export function SchemaPropertyRow(props: SchemaPropertyRowProps) {
  const {
    control,
    index,
    pathPrefix,
    onDeleteProperty,
    indentationLevel = 0,
    highlightedPropertyKey,
    variableUsageInfo,
    parentPath = '',
    onCheckVariableUsage,
  } = props;

  const { setValue, getValues, watch: watchForm } = useFormContext();

  const propertyListItem = watchForm(`${pathPrefix}`) as PropertyListItem;
  const definitionPath = `${pathPrefix}.definition`;
  const currentDefinition = propertyListItem?.definition as JSONSchema7 | undefined;

  const currentType = useSchemaPropertyType(currentDefinition);

  const keyNamePath = `${pathPrefix}.keyName`;
  const isRequiredPath = `${pathPrefix}.isRequired`;

  const enumArrayPath = `${definitionPath}.enum`;
  const enumFieldArrayHook = useFieldArray({
    control,
    name: currentType === 'enum' ? enumArrayPath : `_unused_enum_path_.${index}`,
    keyName: 'enumChoiceId',
  });
  const enumFields = currentType === 'enum' ? enumFieldArrayHook.fields : [];

  const appendEnumChoice = currentType === 'enum' ? enumFieldArrayHook.append : () => {};

  const removeEnumChoice = currentType === 'enum' ? enumFieldArrayHook.remove : () => {};

  const nestedPropertyListPath = `${definitionPath}.propertyList`;
  const objectFieldArray = useFieldArray({
    control,
    name: currentType === 'object' ? nestedPropertyListPath : `_unused_object_path_.${index}`,
    keyName: 'nestedFieldId',
  });
  const nestedFields = currentType === 'object' ? objectFieldArray.fields : [];

  const appendNested = currentType === 'object' ? objectFieldArray.append : () => {};

  const removeNested = currentType === 'object' ? objectFieldArray.remove : () => {};

  const handleAddNestedProperty = useCallback(() => {
    if (currentType !== 'object') {
      setValue(`${definitionPath}.type`, 'object', { shouldValidate: true });
      setValue(nestedPropertyListPath, [], { shouldValidate: true });
      return;
    }

    if (typeof appendNested === 'function') {
      appendNested({
        id: uuidv4(),
        keyName: '',
        definition: newProperty('string'),
        isRequired: false,
      } as PropertyListItem);
    }
  }, [currentType, setValue, definitionPath, nestedPropertyListPath, appendNested]);

  // Logic for array items of type object
  const itemSchemaObjectPath = `${definitionPath}.items`; // Path to the item's schema definition object
  const itemSchemaObject = useWatch({ control, name: itemSchemaObjectPath }) as JSONSchema7 | undefined;
  const itemIsObject = currentType === 'array' && itemSchemaObject?.type === 'object';
  const itemPropertiesListPath = `${itemSchemaObjectPath}.propertyList`; // Path to the list of properties FOR the item, if it's an object

  const arrayItemObjectFieldArray = useFieldArray({
    control,
    name: itemIsObject ? itemPropertiesListPath : `_unused_array_item_object_path_.${index}`,
    keyName: 'itemNestedFieldId',
  });
  const itemNestedFields = itemIsObject ? arrayItemObjectFieldArray.fields : [];

  const appendItemNested = itemIsObject ? arrayItemObjectFieldArray.append : () => {};

  const removeItemNested = itemIsObject ? arrayItemObjectFieldArray.remove : () => {};

  const handleAddArrayItemObjectProperty = useCallback(() => {
    if (!itemIsObject) return;
    const currentList = getValues(itemPropertiesListPath);

    if (!Array.isArray(currentList)) {
      setValue(itemPropertiesListPath, [], { shouldValidate: false });
    }

    if (typeof appendItemNested === 'function') {
      appendItemNested({
        id: uuidv4(),
        keyName: '',
        definition: newProperty('string'),
        isRequired: false,
      } as PropertyListItem);
    }
  }, [itemIsObject, getValues, setValue, itemPropertiesListPath, appendItemNested]);

  if (!propertyListItem) {
    return null;
  }

  const currentKeyName = propertyListItem.keyName;

  // Build the current property's full path
  const currentFullPath = parentPath ? `${parentPath}.${currentKeyName}` : currentKeyName;

  return (
    <div
      className={cn(
        'flex flex-col py-1',
        currentKeyName && currentKeyName === highlightedPropertyKey
          ? 'overflow-hidden rounded-[8px] bg-[rgba(193,221,251,0.50)] px-[2px]'
          : 'px-[2px]'
      )}
    >
      <div className={cn('flex items-center space-x-2', getMarginClassPx(indentationLevel))}>
        <PropertyNameInput fieldPath={keyNamePath} control={control} />
        <PropertyTypeSelector
          definitionPath={definitionPath}
          control={control}
          setValue={setValue}
          getValues={getValues}
        />
        <div className="ml-auto flex items-center space-x-1.5">
          <Controller
            name={isRequiredPath as any}
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`${pathPrefix}-isRequired-checkbox`}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={propertyListItem?.keyName?.trim() === ''}
              />
            )}
          />
          <Label
            htmlFor={`${pathPrefix}-isRequired-checkbox`}
            className="select-none whitespace-nowrap text-xs text-gray-600"
          >
            Required
          </Label>
        </div>
        <PropertyActions
          definitionPath={definitionPath}
          propertyKeyForDisplay={currentKeyName || ''}
          isRequiredPath={isRequiredPath}
          onDeleteProperty={onDeleteProperty}
          isDisabled={!currentKeyName || currentKeyName.trim() === ''}
          variableUsageInfo={variableUsageInfo}
        />
      </div>

      {currentType === 'enum' && (
        <div className={cn('mt-1 space-y-1', getMarginClassPx(indentationLevel + 1))}>
          {enumFields.map((enumField, enumIndex) => {
            const enumChoicePath = `${enumArrayPath}.${enumIndex}`;
            return (
              <div key={enumField.enumChoiceId} className="flex items-center space-x-2">
                <Controller
                  name={enumChoicePath}
                  control={control}
                  render={({ field: choiceField, fieldState: choiceFieldState }) => (
                    <InputRoot hasError={!!choiceFieldState.error} size="2xs" className="flex-1">
                      <InputPure {...choiceField} placeholder={`Choice ${enumIndex + 1}`} className="pl-2 text-xs" />
                      {choiceFieldState.error && (
                        <TooltipProvider delayDuration={0}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex cursor-default items-center justify-center pl-1">
                                <RiErrorWarningLine className="text-destructive h-3 w-3 shrink-0" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="right" sideOffset={4} className="text-xs">
                              <p>{choiceFieldState.error.message}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </InputRoot>
                  )}
                />
                <Button
                  variant="secondary"
                  mode="outline"
                  size="2xs"
                  onClick={() => removeEnumChoice(enumIndex)}
                  leadingIcon={RiDeleteBinLine}
                  className="h-7 w-7 p-1"
                />
              </div>
            );
          })}
          <Button
            size="2xs"
            variant="secondary"
            mode="outline"
            onClick={() => appendEnumChoice('', { shouldFocus: true })}
            leadingIcon={RiAddLine}
            className="mt-1"
          >
            Add Choice
          </Button>
        </div>
      )}

      {currentType === 'object' && (
        <div className={cn('pt-1', getMarginClassPx(indentationLevel + 1))}>
          {nestedFields.map((nestedField, nestedIndex) => {
            const nestedItem = watchForm(`${nestedPropertyListPath}.${nestedIndex}`) as PropertyListItem;
            const nestedKeyName = nestedItem?.keyName;
            const nestedVariableUsageInfo =
              onCheckVariableUsage && nestedKeyName ? onCheckVariableUsage(nestedKeyName, currentFullPath) : undefined;

            return (
              <SchemaPropertyRow
                key={nestedField.nestedFieldId}
                control={control}
                index={nestedIndex}
                pathPrefix={`${nestedPropertyListPath}.${nestedIndex}`}
                onDeleteProperty={() => removeNested(nestedIndex)}
                indentationLevel={0}
                parentPath={currentFullPath}
                variableUsageInfo={nestedVariableUsageInfo}
                onCheckVariableUsage={onCheckVariableUsage}
              />
            );
          })}
          <Button
            size="2xs"
            variant="secondary"
            mode="outline"
            onClick={handleAddNestedProperty}
            leadingIcon={RiAddLine}
            className="mt-1"
          >
            Add Nested Property
          </Button>
        </div>
      )}

      {currentType === 'array' && currentDefinition && (
        <div
          className={cn(
            'mt-2 rounded border border-dashed border-neutral-200 p-2',
            getMarginClassPx(indentationLevel + 1)
          )}
        >
          <div className="mb-1 flex items-center space-x-2">
            <Label className="text-xs font-medium text-gray-700">Array Item Type:</Label>
            <PropertyTypeSelector
              definitionPath={itemSchemaObjectPath}
              control={control}
              setValue={setValue}
              getValues={getValues}
            />
          </div>

          {itemIsObject && (
            <div className={cn('mt-1', getMarginClassPx(1))}>
              {itemNestedFields.map((itemNestedField, itemNestedIndex) => {
                const itemNestedItem = watchForm(`${itemPropertiesListPath}.${itemNestedIndex}`) as PropertyListItem;
                const itemKeyName = itemNestedItem?.keyName;
                // For array items, we use [n] notation
                const arrayItemPath = `${currentFullPath}[n]`;
                const itemVariableUsageInfo =
                  onCheckVariableUsage && itemKeyName ? onCheckVariableUsage(itemKeyName, arrayItemPath) : undefined;

                return (
                  <SchemaPropertyRow
                    key={itemNestedField.itemNestedFieldId}
                    control={control}
                    index={itemNestedIndex}
                    pathPrefix={`${itemPropertiesListPath}.${itemNestedIndex}`}
                    onDeleteProperty={() => removeItemNested(itemNestedIndex)}
                    indentationLevel={0}
                    parentPath={arrayItemPath}
                    variableUsageInfo={itemVariableUsageInfo}
                    onCheckVariableUsage={onCheckVariableUsage}
                  />
                );
              })}
              <Button
                size="2xs"
                variant="secondary"
                mode="outline"
                onClick={handleAddArrayItemObjectProperty}
                leadingIcon={RiAddLine}
                className="mt-1"
              >
                Add Item Property
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
