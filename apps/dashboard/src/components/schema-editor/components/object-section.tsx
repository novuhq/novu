import { memo, useCallback, useMemo } from 'react';
import { type Control, Path, useFieldArray, useWatch } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';
import { MAX_NESTING_DEPTH } from '../constants';
import { SchemaPropertyRow } from '../schema-property-row';
import type { VariableUsageInfo } from '../utils/check-variable-usage';
import { newProperty } from '../utils/json-helpers';
import { getMarginClassPx } from '../utils/ui-helpers';
import type { PropertyListItem, SchemaEditorFormValues } from '../utils/validation-schema';

interface NestedPropertyProps {
  nestedField: any;
  nestedIndex: number;
  nestedPropertyListPath: Path<SchemaEditorFormValues>;
  control: Control<any>;
  onRemove: () => void;
  currentFullPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
  depth: number;
  readOnly?: boolean;
}

const NestedProperty = memo<NestedPropertyProps>(function NestedProperty({
  nestedField,
  nestedIndex,
  nestedPropertyListPath,
  control,
  onRemove,
  currentFullPath,
  onCheckVariableUsage,
  depth,
  readOnly = false,
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
      control={control}
      index={nestedIndex}
      pathPrefix={`${nestedPropertyListPath}.${nestedIndex}` as Path<SchemaEditorFormValues>}
      onDeleteProperty={onRemove}
      indentationLevel={0}
      parentPath={currentFullPath}
      variableUsageInfo={nestedVariableUsageInfo}
      onCheckVariableUsage={onCheckVariableUsage}
      depth={depth + 1}
      readOnly={readOnly}
    />
  );
});

interface ObjectSectionProps {
  nestedPropertyListPath: Path<SchemaEditorFormValues>;
  control: Control<any>;
  indentationLevel: number;
  currentFullPath: string;
  onCheckVariableUsage?: (keyName: string, parentPath: string) => VariableUsageInfo;
  depth: number;
  readOnly?: boolean;
}

export const ObjectSection = memo<ObjectSectionProps>(function ObjectSection({
  nestedPropertyListPath,
  control,
  indentationLevel,
  currentFullPath,
  onCheckVariableUsage,
  depth,
  readOnly = false,
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: nestedPropertyListPath,
    keyName: 'nestedFieldId',
  });

  const isAtMaxDepth = depth >= MAX_NESTING_DEPTH;

  const handleAddNestedProperty = useCallback(() => {
    if (isAtMaxDepth) return;

    const newNestedProperty = {
      id: uuidv4(),
      keyName: '',
      definition: newProperty('string'),
      isRequired: false,
    } as PropertyListItem;

    append(newNestedProperty);
  }, [append, isAtMaxDepth]);

  return (
    <div className={cn('flex flex-col gap-1.5 pt-1.5', getMarginClassPx(indentationLevel + 1))}>
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
          depth={depth}
          readOnly={readOnly}
        />
      ))}
      {isAtMaxDepth && (
        <div className="mt-1 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-600">
          Maximum nesting depth of {MAX_NESTING_DEPTH} levels reached. Cannot add more nested properties.
        </div>
      )}
      <div>
        <Button
          size="2xs"
          variant="secondary"
          mode="lighter"
          onClick={handleAddNestedProperty}
          leadingIcon={RiAddLine}
          disabled={isAtMaxDepth || readOnly}
        >
          Add Nested Property
        </Button>
      </div>
    </div>
  );
});
