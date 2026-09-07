import { type ReactNode, useMemo, useRef, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import { RiErrorWarningLine } from 'react-icons/ri';
import { InputRoot } from '@/components/primitives/input';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { formatJsonBodyString, getRawBodyString, type HttpRequestBodyValue } from './curl-utils';
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
    if (typeof parsed !== 'object' || parsed === null) {
      return 'Body must be a JSON object or array';
    }

    return undefined;
  } catch {
    return 'Invalid JSON syntax';
  }
}

type RawBodyEditorProps = {
  rightSlot?: ReactNode;
};

export function RawBodyEditor({ rightSlot }: RawBodyEditorProps) {
  const { control, getValues } = useFormContext();
  const { saveForm } = useSaveForm();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  // Local draft state — what the user is typing right now (may be invalid)
  // Initialized once from the form value to avoid resetting on each render
  const initialValueRef = useRef<string>(
    formatJsonBodyString(getRawBodyString(getValues('body') as HttpRequestBodyValue))
  );
  const [draft, setDraft] = useState<string>(initialValueRef.current);

  const jsonError = useMemo(() => validateJson(draft), [draft]);

  return (
    <div className="bg-bg-weak flex flex-col gap-1 rounded-lg border border-neutral-100 p-1">
      <SectionHeader
        label="Request body"
        tooltip="Paste or type raw JSON. Supports nested objects and LiquidJS variables."
        rightSlot={rightSlot}
      />
      <Controller
        control={control}
        name="body"
        render={({ field }) => (
          <>
            <InputRoot className="min-h-[120px]" hasError={!!jsonError}>
              <ControlInput
                size="2xs"
                multiline={true}
                indentWithTab={true}
                placeholder={'{\n  "key": "value"\n}'}
                value={draft}
                isAllowedVariable={isAllowedVariable}
                variables={variables}
                onChange={(val) => {
                  const newVal = typeof val === 'string' ? val : '';
                  setDraft(newVal);
                  // Only propagate to the form (and trigger preview update) when valid
                  if (!validateJson(newVal)) {
                    // Persist whitespace-only drafts as empty so the backend sees no body
                    field.onChange(newVal.trim() ? newVal : '');
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
