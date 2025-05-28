import { memo, useCallback, useMemo } from 'react';
import { Controller, Path, useFieldArray, useFormContext, useWatch, type Control } from 'react-hook-form';
import { RiAddLine, RiDeleteBinLine, RiErrorWarningLine } from 'react-icons/ri';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/primitives/button';
import { InputPure, InputRoot } from '@/components/primitives/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/primitives/tooltip';
import { Checkbox } from '@/components/primitives/checkbox';
import { Label } from '@/components/primitives/label';
import { cn } from '@/utils/ui';

import type { JSONSchema7 } from './json-schema';
import { newProperty } from './utils/json-helpers';
import { getMarginClassPx } from './utils/ui-helpers';
import type { PropertyListItem, SchemaEditorFormValues } from './utils/validation-schema';
import type { VariableUsageInfo } from './utils/check-variable-usage';

import { PropertyNameInput } from './components/property-name-input';
import { PropertyTypeSelector } from './components/property-type-selector';
import { useSchemaPropertyType } from './hooks/use-schema-property-type';
import { PropertyActions } from './components/property-actions';

export interface SchemaPropertyRowProps {
  control: Control<SchemaEditorFormValues>;
  index: number;
  pathPrefix: Path<SchemaEditorFormValues>;
  onDeleteProperty: () => void;
  indentationLevel?: number;
  highlightedPropertyKey?: string | null;
  variableUsageInfo?: VariableUsageInfo;
  parentPath?: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

interface EnumChoiceProps {
  enumChoicePath: string;
  enumIndex: number;
  control: Control<any>;
  onRemove: () => void;
}

const EnumChoice = memo<EnumChoiceProps>(function EnumChoice({ enumChoicePath, enumIndex, control, onRemove }) {
  return (
    <div className="flex items-center space-x-2">
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
        onClick={onRemove}
        leadingIcon={RiDeleteBinLine}
        className="h-7 w-7 p-1"
      />
    </div>
  );
});

interface EnumSectionProps {
  enumArrayPath: Path<SchemaEditorFormValues>;
  control: Control<any>;
  indentationLevel: number;
}

const EnumSection = memo<EnumSectionProps>(function EnumSection({ enumArrayPath, control, indentationLevel }) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: enumArrayPath,
    keyName: 'enumChoiceId',
  });

  const handleAddChoice = useCallback(() => {
    append('', { shouldFocus: true });
  }, [append]);

  return (
    <div className={cn('mt-1 space-y-1', getMarginClassPx(indentationLevel + 1))}>
      {fields.map((enumField, enumIndex) => (
        <EnumChoice
          key={enumField.enumChoiceId}
          enumChoicePath={`${enumArrayPath}.${enumIndex}`}
          enumIndex={enumIndex}
          control={control}
          onRemove={() => remove(enumIndex)}
        />
      ))}
      <Button
        size="2xs"
        variant="secondary"
        mode="outline"
        onClick={handleAddChoice}
        leadingIcon={RiAddLine}
        className="mt-1"
      >
        Add Choice
      </Button>
    </div>
  );
});

interface NestedPropertyProps {
  nestedField: any;
  nestedIndex: number;
  nestedPropertyListPath: Path<SchemaEditorFormValues>;
  control: Control<any>;
  onRemove: () => void;
  currentFullPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

const NestedProperty = memo<NestedPropertyProps>(function NestedProperty({
  nestedField,
  nestedIndex,
  nestedPropertyListPath,
  control,
  onRemove,
  currentFullPath,
  onCheckVariableUsage,
}) {
  const nestedItem = useWatch({
    control,
    name: `${nestedPropertyListPath}.${nestedIndex}`,
  });

  const nestedVariableUsageInfo = useMemo(() => {
    const nestedKeyName = nestedItem?.keyName;
    return onCheckVariableUsage && nestedKeyName ? onCheckVariableUsage(nestedKeyName, currentFullPath) : undefined;
  }, [onCheckVariableUsage, nestedItem?.keyName, currentFullPath]);

  return (
    <SchemaPropertyRow
      key={nestedField.nestedFieldId}
      control={control}
      index={nestedIndex}
      pathPrefix={`${nestedPropertyListPath}.${nestedIndex}` as Path<SchemaEditorFormValues>}
      onDeleteProperty={onRemove}
      indentationLevel={0}
      parentPath={currentFullPath}
      variableUsageInfo={nestedVariableUsageInfo}
      onCheckVariableUsage={onCheckVariableUsage}
    />
  );
});

interface ObjectSectionProps {
  nestedPropertyListPath: Path<SchemaEditorFormValues>;
  control: Control<any>;
  indentationLevel: number;
  currentFullPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
  onAddProperty: () => void;
}

const ObjectSection = memo<ObjectSectionProps>(function ObjectSection({
  nestedPropertyListPath,
  control,
  indentationLevel,
  currentFullPath,
  onCheckVariableUsage,
  onAddProperty,
}) {
  const { fields, remove } = useFieldArray({
    control,
    name: nestedPropertyListPath,
    keyName: 'nestedFieldId',
  });

  return (
    <div className={cn('pt-1', getMarginClassPx(indentationLevel + 1))}>
      {fields.map((nestedField, nestedIndex) => (
        <NestedProperty
          key={nestedField.nestedFieldId}
          nestedField={nestedField}
          nestedIndex={nestedIndex}
          nestedPropertyListPath={nestedPropertyListPath}
          control={control}
          onRemove={() => remove(nestedIndex)}
          currentFullPath={currentFullPath}
          onCheckVariableUsage={onCheckVariableUsage}
        />
      ))}
      <Button
        size="2xs"
        variant="secondary"
        mode="outline"
        onClick={onAddProperty}
        leadingIcon={RiAddLine}
        className="mt-1"
      >
        Add Nested Property
      </Button>
    </div>
  );
});

interface ArrayItemPropertyProps {
  itemNestedField: any;
  itemNestedIndex: number;
  itemPropertiesListPath: string;
  control: Control<any>;
  onRemove: () => void;
  arrayItemPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

const ArrayItemProperty = memo<ArrayItemPropertyProps>(function ArrayItemProperty({
  itemNestedField,
  itemNestedIndex,
  itemPropertiesListPath,
  control,
  onRemove,
  arrayItemPath,
  onCheckVariableUsage,
}) {
  const itemNestedItem = useWatch({
    control,
    name: `${itemPropertiesListPath}.${itemNestedIndex}`,
  }) as PropertyListItem;

  const itemVariableUsageInfo = useMemo(() => {
    const itemKeyName = itemNestedItem?.keyName;
    return onCheckVariableUsage && itemKeyName ? onCheckVariableUsage(itemKeyName, arrayItemPath) : undefined;
  }, [onCheckVariableUsage, itemNestedItem?.keyName, arrayItemPath]);

  return (
    <SchemaPropertyRow
      key={itemNestedField.itemNestedFieldId}
      control={control}
      index={itemNestedIndex}
      pathPrefix={`${itemPropertiesListPath}.${itemNestedIndex}` as Path<SchemaEditorFormValues>}
      onDeleteProperty={onRemove}
      indentationLevel={0}
      parentPath={arrayItemPath}
      variableUsageInfo={itemVariableUsageInfo}
      onCheckVariableUsage={onCheckVariableUsage}
    />
  );
});

interface ArraySectionProps {
  itemSchemaObjectPath: string;
  itemPropertiesListPath: string;
  control: Control<any>;
  setValue: any;
  getValues: any;
  indentationLevel: number;
  currentFullPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

const ArraySection = memo<ArraySectionProps>(function ArraySection({
  itemSchemaObjectPath,
  itemPropertiesListPath,
  control,
  setValue,
  getValues,
  indentationLevel,
  currentFullPath,
  onCheckVariableUsage,
}) {
  const itemSchemaObject = useWatch({ control, name: itemSchemaObjectPath }) as JSONSchema7 | undefined;
  const itemIsObject = itemSchemaObject?.type === 'object';

  const { fields, append, remove } = useFieldArray({
    control,
    name: itemIsObject ? itemPropertiesListPath : `_unused_array_item_object_path_`,
    keyName: 'itemNestedFieldId',
  });

  const handleAddArrayItemObjectProperty = useCallback(() => {
    if (!itemIsObject) return;

    const currentList = getValues(itemPropertiesListPath);

    if (!Array.isArray(currentList)) {
      setValue(itemPropertiesListPath, [], { shouldValidate: false });
    }

    append({
      id: uuidv4(),
      keyName: '',
      definition: newProperty('string'),
      isRequired: false,
    } as PropertyListItem);
  }, [itemIsObject, getValues, setValue, itemPropertiesListPath, append]);

  const arrayItemPath = `${currentFullPath}[n]`;

  return (
    <div
      className={cn('mt-2 rounded border border-dashed border-neutral-200 p-2', getMarginClassPx(indentationLevel + 1))}
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
          {fields.map((itemNestedField, itemNestedIndex) => (
            <ArrayItemProperty
              key={itemNestedField.itemNestedFieldId}
              itemNestedField={itemNestedField}
              itemNestedIndex={itemNestedIndex}
              itemPropertiesListPath={itemPropertiesListPath}
              control={control}
              onRemove={() => remove(itemNestedIndex)}
              arrayItemPath={arrayItemPath}
              onCheckVariableUsage={onCheckVariableUsage}
            />
          ))}
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
  );
});

export const SchemaPropertyRow = memo<SchemaPropertyRowProps>(function SchemaPropertyRow(props) {
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

  const { setValue, getValues } = useFormContext();

  const propertyListItem = useWatch({ control, name: pathPrefix }) as PropertyListItem;

  const definitionPath = useMemo<Path<SchemaEditorFormValues>>(
    () => `${pathPrefix}.definition` as Path<SchemaEditorFormValues>,
    [pathPrefix]
  );
  const keyNamePath = useMemo<Path<SchemaEditorFormValues>>(
    () => `${pathPrefix}.keyName` as Path<SchemaEditorFormValues>,
    [pathPrefix]
  );
  const isRequiredPath = useMemo<Path<SchemaEditorFormValues>>(
    () => `${pathPrefix}.isRequired` as Path<SchemaEditorFormValues>,
    [pathPrefix]
  );

  const currentDefinition = propertyListItem?.definition as JSONSchema7 | undefined;
  const currentType = useSchemaPropertyType(currentDefinition);
  const currentKeyName = propertyListItem?.keyName;

  const currentFullPath = useMemo(() => {
    return parentPath ? `${parentPath}.${currentKeyName}` : currentKeyName;
  }, [parentPath, currentKeyName]);

  const enumArrayPath = useMemo<Path<SchemaEditorFormValues>>(
    () => `${definitionPath}.enum` as Path<SchemaEditorFormValues>,
    [definitionPath]
  );
  const nestedPropertyListPath = useMemo<Path<SchemaEditorFormValues>>(
    () => `${definitionPath}.propertyList` as Path<SchemaEditorFormValues>,
    [definitionPath]
  );
  const itemSchemaObjectPath = useMemo(() => `${definitionPath}.items`, [definitionPath]);
  const itemPropertiesListPath = useMemo(() => `${itemSchemaObjectPath}.propertyList`, [itemSchemaObjectPath]);

  const { append: appendNested } = useFieldArray({
    control,
    name:
      currentType === 'object'
        ? (nestedPropertyListPath as any)
        : (`_unused_object_path_.${index}` as Path<SchemaEditorFormValues>),
    keyName: 'nestedFieldId',
  });

  const handleAddNestedProperty = useCallback(() => {
    if (currentType !== 'object') {
      setValue(`${definitionPath}.type`, 'object', { shouldValidate: true });
      setValue(nestedPropertyListPath, [], { shouldValidate: true });
      return;
    }

    appendNested({
      id: uuidv4(),
      keyName: '',
      definition: newProperty('string'),
      isRequired: false,
    } as PropertyListItem);
  }, [currentType, setValue, definitionPath, nestedPropertyListPath, appendNested]);

  const isHighlighted = currentKeyName && currentKeyName === highlightedPropertyKey;
  const isKeyNameEmpty = !currentKeyName || currentKeyName.trim() === '';

  if (!propertyListItem) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex flex-col py-1',
        isHighlighted ? 'overflow-hidden rounded-[8px] bg-[rgba(193,221,251,0.50)] px-[2px]' : 'px-[2px]'
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
            name={isRequiredPath}
            control={control}
            render={({ field }) => (
              <Checkbox
                id={`${pathPrefix}-isRequired-checkbox`}
                checked={!!field.value}
                onCheckedChange={field.onChange}
                disabled={isKeyNameEmpty}
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
          isDisabled={isKeyNameEmpty}
          variableUsageInfo={variableUsageInfo}
        />
      </div>

      {currentType === 'enum' && (
        <EnumSection enumArrayPath={enumArrayPath} control={control} indentationLevel={indentationLevel} />
      )}

      {currentType === 'object' && (
        <ObjectSection
          nestedPropertyListPath={nestedPropertyListPath}
          control={control}
          indentationLevel={indentationLevel}
          currentFullPath={currentFullPath}
          onCheckVariableUsage={onCheckVariableUsage}
          onAddProperty={handleAddNestedProperty}
        />
      )}

      {currentType === 'array' && currentDefinition && (
        <ArraySection
          itemSchemaObjectPath={itemSchemaObjectPath}
          itemPropertiesListPath={itemPropertiesListPath}
          control={control}
          setValue={setValue}
          getValues={getValues}
          indentationLevel={indentationLevel}
          currentFullPath={currentFullPath}
          onCheckVariableUsage={onCheckVariableUsage}
        />
      )}
    </div>
  );
});
