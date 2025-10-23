import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';
import { VariableSelect } from '@/components/conditions-editor/variable-select';
import { Code2 } from '@/components/icons/code-2';
import { Button } from '@/components/primitives/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';

function parseLiquidVariables(value: string | undefined): string {
  if (!value) return '';
  const matches = value.match(/\{\{[^}]+\}\}/g) || [];

  if (matches.length > 0) {
    return matches.map((match) => match.replace(/[{}]/g, '').trim()).join(' ');
  }

  return value;
}

const FORM_CONTROL_NAME = 'controlValues.dynamicKey';

export const DynamicDelay = () => {
  const { step } = useWorkflow();
  const { variables } = useParseVariables(step?.variables);
  const payloadVariables = useMemo(
    () => variables.filter((variable) => variable.name.startsWith('payload.')),
    [variables]
  );
  const form = useFormContext();
  const { control, setValue } = form;
  const { saveForm } = useSaveForm();

  const tooltipContent = (
    <div className="space-y-2">
      <div>
        <p className="font-medium mb-1">Supported formats:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>ISO-8601 timestamp: "2025-01-01T12:00:00Z" (must be future)</li>
          <li>Duration object: {`{ "amount": 30, "unit": "minutes" }`}</li>
        </ul>
      </div>
      <div>
        <p className="font-medium mb-1">Examples:</p>
        <p>
          <code className="text-xs">payload.scheduledTime</code>, <code className="text-xs">payload.delayWindow</code>
        </p>
      </div>
    </div>
  );

  return (
    <FormField
      control={control}
      name={FORM_CONTROL_NAME}
      render={({ field }) => (
        <FormItem className="flex w-full flex-col">
          <>
            <FormLabel tooltip={tooltipContent}>Dynamic delay key</FormLabel>
            <div className="flex flex-row gap-1">
              <VariableSelect
                key={field.value || 'empty'}
                leftIcon={<Code2 className="text-feature size-3 min-w-3" />}
                onChange={(value) => {
                  if (value) {
                    setValue(FORM_CONTROL_NAME, value, { shouldDirty: true });
                    saveForm();
                  }
                }}
                options={payloadVariables.map((variable) => ({
                  label: variable.name,
                  value: variable.name,
                }))}
                value={parseLiquidVariables(field.value)}
                placeholder="payload.scheduledTime"
                className="w-full"
                emptyState={
                  <p className="text-foreground-600 mt-1 p-1 text-xs">
                    Select a payload variable to define the dynamic delay duration
                  </p>
                }
              />
              <div className="transition-all duration-200 ease-in-out">
                {field.value && (
                  <Button
                    variant="secondary"
                    mode="ghost"
                    size="2xs"
                    className="hover:bg-muted animate-in fade-in slide-in-from-right-4 h-[28px] w-[28px] p-0 duration-200"
                    onClick={() => {
                      setValue(FORM_CONTROL_NAME, '', { shouldDirty: true });
                      saveForm();
                    }}
                  >
                    <X className="size-3" />
                  </Button>
                )}
              </div>
            </div>
            <FormMessage />
          </>
        </FormItem>
      )}
    />
  );
};
