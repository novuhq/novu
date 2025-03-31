import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { ControlInput } from '@/components/primitives/control-input';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariablesToLiquidVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { capitalize, containsHTMLEntities } from '@/utils/string';
import { InputRoot } from '@/components/primitives/input';

const subjectKey = 'subject';

export const InAppSubject = () => {
  const { control, getValues } = useFormContext();
  const { step } = useWorkflow();
  const variables = useMemo(() => (step ? parseStepVariablesToLiquidVariables(step.variables) : []), [step]);

  return (
    <FormField
      control={control}
      name={subjectKey}
      render={({ field, fieldState }) => {
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
            <FormMessage>
              {containsHTMLEntities(field.value) &&
                !getValues('disableOutputSanitization') &&
                'HTML entities detected. Consider disabling content sanitization for proper rendering'}
            </FormMessage>
          </FormItem>
        );
      }}
    />
  );
};
