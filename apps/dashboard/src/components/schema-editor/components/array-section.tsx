import { memo, useCallback, useMemo } from 'react';
import { type Control, Path, useFieldArray, useWatch } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/primitives/button';
import { Label } from '@/components/primitives/label';
import { cn } from '@/utils/ui';
import { MAX_NESTING_DEPTH } from '../constants';
import type { JSONSchema7 } from '../json-schema';
import { SchemaPropertyRow } from '../schema-property-row';
import type { VariableUsageInfo } from '../utils/check-variable-usage';
import { newProperty } from '../utils/json-helpers';
import { getMarginClassPx } from '../utils/ui-helpers';
import type { PropertyListItem, SchemaEditorFormValues } from '../utils/validation-schema';
import { PropertyTypeSelector } from './property-type-selector';

interface ArrayItemPropertyProps {
  className?: string;
  itemNestedIndex: number;
  itemPropertiesListPath: string;
  control: Control<any>;
  onRemove: () => void;
  arrayItemPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
  depth: number;
  readOnly?: boolean;
}

const ArrayItemProperty = memo<ArrayItemPropertyProps>(function ArrayItemProperty({
  className,
  itemNestedIndex,
  itemPropertiesListPath,
  control,
  onRemove,
  arrayItemPath,
  onCheckVariableUsage,
  depth,
  readOnly = false,
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
      depth={depth + 1}
      readOnly={readOnly}
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
  depth: number;
  readOnly?: boolean;
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
  depth,
  readOnly = false,
}) {
  const itemSchemaObject = useWatch({ control, name: itemSchemaObjectPath }) as JSONSchema7 | undefined;
  const itemIsObject = itemSchemaObject?.type === 'object';

  const { fields, append, remove } = useFieldArray({
    control,
    name: itemIsObject ? itemPropertiesListPath : `_unused_array_item_object_path_`,
    keyName: 'itemNestedFieldId',
  });

  const isAtMaxDepth = depth >= MAX_NESTING_DEPTH;

  const handleAddArrayItemObjectProperty = useCallback(() => {
    if (!itemIsObject || isAtMaxDepth) return;

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
  }, [itemIsObject, getValues, setValue, itemPropertiesListPath, append, isAtMaxDepth]);

  const arrayItemPath = `${currentFullPath}[n]`;

  return (
    <div className={cn('p-1', getMarginClassPx(indentationLevel + 1))}>
      <div className="mb-1 flex items-center space-x-2">
        <Label className="text-xs font-medium text-gray-700">Array Item Type:</Label>
        <PropertyTypeSelector
          definitionPath={itemSchemaObjectPath}
          control={control}
          setValue={setValue}
          getValues={getValues}
          isDisabled={readOnly}
        />
      </div>

      {itemIsObject && (
        <div className={cn('flex flex-col gap-1.5 pt-1.5', getMarginClassPx(1))}>
          {fields.map((itemNestedField, itemNestedIndex) => (
            <ArrayItemProperty
              key={itemNestedField.itemNestedFieldId}
              itemNestedIndex={itemNestedIndex}
              itemPropertiesListPath={itemPropertiesListPath}
              control={control}
              onRemove={() => remove(itemNestedIndex)}
              arrayItemPath={arrayItemPath}
              onCheckVariableUsage={onCheckVariableUsage}
              depth={depth}
              readOnly={readOnly}
            />
          ))}
          {isAtMaxDepth && (
            <div className="mt-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
              Maximum nesting depth of {MAX_NESTING_DEPTH} levels reached. Cannot add more item properties.
            </div>
          )}
          <div>
            <Button
              size="2xs"
              variant="secondary"
              mode="lighter"
              onClick={handleAddArrayItemObjectProperty}
              leadingIcon={RiAddLine}
              className="mt-1"
              disabled={isAtMaxDepth || readOnly}
            >
              Add Item Property
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});
