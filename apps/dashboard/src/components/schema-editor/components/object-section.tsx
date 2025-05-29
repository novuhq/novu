import { memo, useCallback, useMemo } from 'react';
import { Path, useFieldArray, useWatch, type Control } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';
import { v4 as uuidv4 } from 'uuid';

import { Button } from '@/components/primitives/button';
import { cn } from '@/utils/ui';

import { getMarginClassPx } from '../utils/ui-helpers';
import type { PropertyListItem, SchemaEditorFormValues } from '../utils/validation-schema';
import type { VariableUsageInfo } from '../utils/check-variable-usage';
import { newProperty } from '../utils/json-helpers';
import { SchemaPropertyRow } from '../schema-property-row';

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
}

export const ObjectSection = memo<ObjectSectionProps>(function ObjectSection({
  nestedPropertyListPath,
  control,
  indentationLevel,
  currentFullPath,
  onCheckVariableUsage,
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: nestedPropertyListPath,
    keyName: 'nestedFieldId',
  });

  const handleAddNestedProperty = useCallback(() => {
    const newNestedProperty = {
      id: uuidv4(),
      keyName: '',
      definition: newProperty('string'),
      isRequired: false,
    } as PropertyListItem;

    append(newNestedProperty);
  }, [append]);

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
        mode="lighter"
        onClick={handleAddNestedProperty}
        leadingIcon={RiAddLine}
        className="mt-1"
      >
        Add Nested Property
      </Button>
    </div>
  );
});
