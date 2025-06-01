import { memo, useCallback, useMemo } from 'react';
import { Path, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/primitives/button';
import { Label } from '@/components/primitives/label';
import { cn } from '@/utils/ui';

import { getMarginClassPx } from '../utils/ui-helpers';
import type { PropertyListItem, SchemaEditorFormValues } from '../utils/validation-schema';
import type { VariableUsageInfo } from '../utils/check-variable-usage';
import type { JSONSchema7 } from '../json-schema';
import { newProperty } from '../utils/json-helpers';
import { PropertyTypeSelector } from './property-type-selector';
import { SchemaPropertyRow } from '../schema-property-row';

interface ArrayItemPropertyProps {
  className?: string;
  itemNestedIndex: number;
  itemPropertiesListPath: string;
  control: Control<any>;
  onRemove: () => void;
  arrayItemPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
}

const ArrayItemProperty = memo<ArrayItemPropertyProps>(function ArrayItemProperty({
  className,
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
      className={className}
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

export const ArraySection = memo<ArraySectionProps>(function ArraySection({
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
              className="mt-1"
              key={itemNestedField.itemNestedFieldId}
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
