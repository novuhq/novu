import React, { useCallback, useMemo } from 'react';
import { type Control, type FieldArrayWithId, FormProvider, type UseFormReturn } from 'react-hook-form';
import { RiAddLine } from 'react-icons/ri';

import { Button } from '@/components/primitives/button';
import { FormRoot } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { SchemaPropertyRow } from './schema-property-row';
import { checkVariableUsageInWorkflow, type VariableUsageInfo } from './utils/check-variable-usage';
import type { PropertyListItem, SchemaEditorFormValues } from './utils/validation-schema';

interface SchemaEditorProps {
  control: Control<SchemaEditorFormValues>;
  fields: FieldArrayWithId<SchemaEditorFormValues, 'propertyList', 'fieldId'>[];
  formState: {
    isValid: boolean;
    errors: Record<string, any>;
  };
  addProperty: (propertyData?: Partial<PropertyListItem>, type?: any) => void;
  removeProperty: (index: number) => void;
  methods: UseFormReturn<SchemaEditorFormValues>;
  highlightedPropertyKey?: string | null;
  readOnly?: boolean;
}

export function SchemaEditor({
  control,
  fields,
  formState,
  addProperty,
  removeProperty,
  methods,
  highlightedPropertyKey,
  readOnly = false,
}: SchemaEditorProps) {
  const { workflow } = useWorkflow();

  // Function to check variable usage with parent path support
  const checkVariableUsage = useCallback(
    (keyName: string, parentPath: string = ''): VariableUsageInfo => {
      if (!workflow?.steps || !keyName) {
        return { isUsed: false, usedInSteps: [] };
      }

      return checkVariableUsageInWorkflow(keyName, workflow.steps, parentPath);
    },
    [workflow?.steps]
  );

  // Create a map of variable usage info for top-level fields
  const variableUsageMap = useMemo(() => {
    const map = new Map<string, VariableUsageInfo>();

    if (!workflow?.steps) return map;

    fields.forEach((field) => {
      const keyName = field.keyName;

      if (keyName) {
        const usageInfo = checkVariableUsage(keyName);
        map.set(keyName, usageInfo);
      }
    });

    return map;
  }, [fields, workflow?.steps, checkVariableUsage]);

  return (
    <FormProvider {...methods}>
      <FormRoot className="rounded-4 bg-bg-white border-1 flex flex-col gap-1.5 border border-neutral-100 p-1.5">
        {fields.map((field, index) => {
          const variableUsageInfo = variableUsageMap.get(field.keyName) || { isUsed: false, usedInSteps: [] };

          return (
            <SchemaPropertyRow
              key={field.fieldId}
              control={control}
              index={index}
              pathPrefix={`propertyList.${index}`}
              onDeleteProperty={() => removeProperty(index)}
              indentationLevel={0}
              highlightedPropertyKey={highlightedPropertyKey}
              variableUsageInfo={variableUsageInfo}
              onCheckVariableUsage={checkVariableUsage}
              depth={0}
              readOnly={readOnly}
            />
          );
        })}
        <div>
          <Button
            variant="secondary"
            mode="lighter"
            size="2xs"
            onClick={() => addProperty()}
            leadingIcon={RiAddLine}
            disabled={readOnly || (!formState.isValid && fields.length > 0)}
          >
            Add property
          </Button>
        </div>
      </FormRoot>
    </FormProvider>
  );
}
