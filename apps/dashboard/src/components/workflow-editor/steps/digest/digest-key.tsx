import { X } from 'lucide-react';
import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { Code2 } from '@/components/icons/code-2';
import { Button } from '@/components/primitives/button';
import { FormField, FormItem, FormLabel, FormMessage } from '@/components/primitives/form/form';
import { useSaveForm } from '@/components/workflow-editor/steps/save-form-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '../../../../hooks/use-parse-variables';
import { VariableSelect } from '../../../conditions-editor/variable-select';

function parseLiquidVariables(value: string | undefined): string {
  const matches = value?.match(/{{(.*?)}}/g) || [];
  return matches.map((match) => match.replace(/[{}]/g, '').trim()).join(' ');
}

const FORM_CONTROL_NAME = 'controlValues.digestKey';

export const DigestKey = () => {
  const { step } = useWorkflow();
  const { variables } = useParseVariables(step?.variables);
  const payloadVariables = useMemo(
    () => variables.filter((variable) => variable.name.startsWith('payload.')),
    [variables]
  );
  const form = useFormContext();
  const { control, setValue } = form;
  const { saveForm } = useSaveForm();

  return (
    <FormField
      control={control}
      name={FORM_CONTROL_NAME}
      render={({ field }) => (
        <FormItem className="flex w-full flex-col">
          <>
            <FormLabel tooltip="Digest is grouped by the subscriberId by default. You can add one more aggregation key to group events further.">
              Group events by
            </FormLabel>
            <div className="flex flex-row gap-1">
              <div className="flex h-[28px] items-center gap-1">
                <Code2 className="text-feature size-3 min-w-3" />
                <span className="text-foreground-600 whitespace-nowrap text-xs font-normal">subscriberId - </span>
              </div>
              <VariableSelect
                key={field.value || 'empty'} // This key is used to force the component to re-render when the value changes
                leftIcon={<Code2 className="text-feature size-3 min-w-3" />}
                onChange={(value) => {
                  if (value) {
                    setValue(FORM_CONTROL_NAME, `{{${value}}}`, { shouldDirty: true });
                    saveForm();
                  }
                }}
                options={payloadVariables.map((variable) => ({
                  label: variable.name,
                  value: variable.name,
                }))}
                value={parseLiquidVariables(field.value)}
                placeholder="payload."
                className="w-full"
                emptyState={
                  <p className="text-foreground-600 mt-1 p-1 text-xs">
                    Refine the digest aggregation key further by specifying a payload variable
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
