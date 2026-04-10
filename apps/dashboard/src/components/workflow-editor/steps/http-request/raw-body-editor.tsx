import { useMemo } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { RiErrorWarningLine } from 'react-icons/ri';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { SectionHeader } from './section-header';

function validateJson(value: string): string | undefined {
  if (!value || !value.trim()) {
    return undefined;
  }

  if (value.includes('{{')) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return 'Body must be a JSON object';
    }

    return undefined;
  } catch {
    return 'Invalid JSON syntax';
  }
}

export function RawBodyEditor() {
  const { control, watch } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  const rawBodyValue = watch('rawBody') ?? '';
  const jsonError = useMemo(() => validateJson(rawBodyValue), [rawBodyValue]);

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader label="Request body (raw JSON)" tooltip="Paste or type raw JSON. Supports nested objects and LiquidJS variables." />
      <Controller
        control={control}
        name="rawBody"
        render={({ field }) => (
          <>
            <InputRoot className="min-h-[120px]" hasError={!!jsonError}>
              <ControlInput
                size="2xs"
                multiline={true}
                indentWithTab={true}
                placeholder={'{\n  "key": "value"\n}'}
                value={field.value ?? ''}
                isAllowedVariable={isAllowedVariable}
                variables={variables}
                onChange={(val) => {
                  const newVal = typeof val === 'string' ? val : '';
                  field.onChange(newVal);
                  if (!validateJson(newVal)) {
                    saveForm();
                  }
                }}
                onBlur={() => {
                  field.onBlur();
                }}
              />
            </InputRoot>
            {jsonError && (
              <div className="flex items-center gap-1 px-1">
                <RiErrorWarningLine className="text-destructive h-3 w-3 shrink-0" />
                <span className="text-destructive text-xs">{jsonError}</span>
              </div>
            )}
          </>
        )}
      />
    </div>
  );
}
