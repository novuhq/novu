import React, { useMemo } from 'react';
import { RiAddLine } from 'react-icons/ri';
import { FormProvider, type Control, type FieldArrayWithId, type UseFormReturn } from 'react-hook-form';

import { Button } from '@/components/primitives/button';
import { SchemaPropertyRow } from './schema-property-row';
import type { SchemaEditorFormValues, PropertyListItem } from './utils/validation-schema';
import { checkVariableUsageInWorkflow, type VariableUsageInfo } from './utils/check-variable-usage';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';

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
}

export function SchemaEditor({
  control,
  fields,
  formState,
  addProperty,
  removeProperty,
  methods,
  highlightedPropertyKey,
}: SchemaEditorProps) {
  const { workflow } = useWorkflow();

  // Create a map of variable usage info for each field
  const variableUsageMap = useMemo(() => {
    const map = new Map<string, VariableUsageInfo>();

    if (!workflow?.steps) return map;

    fields.forEach((field) => {
      const keyName = field.keyName;

      if (keyName) {
        const usageInfo = checkVariableUsageInWorkflow(keyName, workflow.steps);
        map.set(keyName, usageInfo);
      }
    });

    return map;
  }, [fields, workflow?.steps]);

  return (
    <FormProvider {...methods}>
      <div className="rounded-4 bg-bg-white border border-neutral-100 p-2 px-[2px]">
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
            />
          );
        })}
        <Button
          variant="secondary"
          mode="lighter"
          size="2xs"
          onClick={() => addProperty()}
          className="mt-2"
          leadingIcon={RiAddLine}
          disabled={!formState.isValid && fields.length > 0}
        >
          Add property
        </Button>
      </div>
    </FormProvider>
  );
}
