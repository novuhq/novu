import { Controller, useFormContext } from 'react-hook-form';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { SectionHeader } from './section-header';

export function RawBodyEditor() {
  const { control } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader label="Request body (raw JSON)" tooltip="Paste or type raw JSON. Supports nested objects and LiquidJS variables." />
      <Controller
        control={control}
        name="rawBody"
        render={({ field, fieldState }) => (
          <InputRoot className="min-h-[120px]" hasError={!!fieldState.error}>
            <ControlInput
              size="2xs"
              multiline={true}
              indentWithTab={true}
              placeholder={'{\n  "key": "value"\n}'}
              value={field.value ?? ''}
              isAllowedVariable={isAllowedVariable}
              variables={variables}
              onChange={(val) => field.onChange(typeof val === 'string' ? val : '')}
              onBlur={() => {
                field.onBlur();
                saveForm();
              }}
            />
          </InputRoot>
        )}
      />
    </div>
  );
}
