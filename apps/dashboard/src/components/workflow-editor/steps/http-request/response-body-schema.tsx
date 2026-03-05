import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import type { JSONSchema7 } from '@/components/schema-editor';
import { SchemaEditor } from '@/components/schema-editor';
import { useSchemaForm } from '@/components/schema-editor/use-schema-form';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { SectionHeader } from './section-header';

export function ResponseBodySchema() {
  const { getValues, setValue } = useFormContext();
  const { saveForm } = useSaveForm();

  const initialSchema = (getValues('responseBodySchema') as JSONSchema7) ?? { type: 'object', properties: {} };

  const handleSchemaChange = useCallback(
    (updatedSchema: JSONSchema7) => {
      setValue('responseBodySchema', updatedSchema, { shouldDirty: true });
      saveForm();
    },
    [setValue, saveForm]
  );

  const { control, fields, formState, addProperty, removeProperty, methods } = useSchemaForm({
    initialSchema,
    onChange: handleSchemaChange,
  });

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader
        label="Response body schema"
        tooltip="Define the schema of the response body to use variables from it in subsequent steps"
      />

      <SchemaEditor
        control={control}
        fields={fields}
        formState={formState}
        addProperty={addProperty}
        removeProperty={removeProperty}
        methods={methods}
      />
    </div>
  );
}
