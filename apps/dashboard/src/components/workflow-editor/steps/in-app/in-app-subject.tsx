import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { ControlInput } from '@/components/primitives/control-input';
import { FormControl, FormField, FormItem, FormMessage, FormMessagePure } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariablesToLiquidVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { capitalize } from '@/utils/string';
import { InputRoot } from '@/components/primitives/input';

const PopularHTMLEntities = Object.freeze(['&', '<', '>', '"', "'"]);

function containsHTMLEntities(value: string) {
  return PopularHTMLEntities.some((entity) => value.includes(entity));
}

const subjectKey = 'subject';

export const InAppSubject = () => {
  const { control } = useFormContext();
  const { step } = useWorkflow();
  const variables = useMemo(() => (step ? parseStepVariablesToLiquidVariables(step.variables) : []), [step]);

  return (
    <FormField
      control={control}
      name={subjectKey}
      render={({ field, fieldState, formState }) => {
        return (
          <FormItem className="w-full">
            <FormControl>
              <InputRoot hasError={!!fieldState.error}>
                <ControlInput
                  multiline={false}
                  indentWithTab={false}
                  placeholder={capitalize(field.name)}
                  id={field.name}
                  value={field.value}
                  onChange={field.onChange}
                  variables={variables}
                />
              </InputRoot>
            </FormControl>
            {containsHTMLEntities(field.value) && !formState.defaultValues?.disableOutputSanitization && (
              <FormMessagePure className="mt-2">
                HTML entities detected. Consider disabling content sanitization for proper rendering.
              </FormMessagePure>
            )}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};
