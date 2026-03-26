import { useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { Separator } from '@/components/primitives/separator';
import type { JSONSchema7 } from '@/components/schema-editor';
import { SchemaEditor } from '@/components/schema-editor';
import { useSchemaForm } from '@/components/schema-editor/use-schema-form';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useStepEditor } from '../context/step-editor-context';
import { EnforceSchemaValidation } from './enforce-schema-validation';
import { SectionHeader } from './section-header';

export function ResponseBodySchema() {
  const { getValues, setValue } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step } = useStepEditor();

  const initialSchema = (getValues('responseBodySchema') as JSONSchema7) ?? { type: 'object', properties: {} };

  const handleSchemaChange = useCallback(
    (updatedSchema: JSONSchema7) => {
      setValue('responseBodySchema', updatedSchema, { shouldDirty: true });
      saveForm();
    },
    [setValue, saveForm]
  );

  const { control, fields, formState, addProperty, removeProperty, methods, resetToSchema } = useSchemaForm({
    initialSchema,
    onChange: handleSchemaChange,
  });

  return (
    <div className="bg-bg-weak flex flex-col rounded-lg border border-neutral-100 p-1">
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

      <Separator className="mt-1.5 mb-1.5 bg-neutral-50" />

      <div>
        <EnforceSchemaValidation onSchemaGenerated={resetToSchema} />
      </div>

      <div className="mt-1.5 flex items-center gap-2 overflow-clip rounded-md border border-neutral-100 bg-white p-2">
        <div className="flex h-full shrink-0 items-stretch">
          <div className="w-1 rounded-full bg-[#717784]" />
        </div>
        <p className="text-xs leading-4 text-[#525866]">
          <span className="font-medium text-[#0e121b]">Note: </span>
          {'These values can be accessed in subsequent steps via '}
          <span className="font-mono font-medium tracking-[-0.24px]">{`{{steps.${step.stepId}.<key>}}`}</span>
        </p>
      </div>
    </div>
  );
}
