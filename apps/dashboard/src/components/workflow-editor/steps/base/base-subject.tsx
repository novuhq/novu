import { useMemo } from 'react';
import { useFormContext } from 'react-hook-form';

import { ControlInput } from '@/components/primitives/control-input';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { parseStepVariables } from '@/utils/parseStepVariablesToLiquidVariables';
import { capitalize } from '@/utils/string';
import { InputRoot } from '../../../primitives/input';

const subjectKey = 'subject';

export const BaseSubject = () => {
  const { control } = useFormContext();
  const { step } = useWorkflow();
  const { variables, namespaces } = useMemo(
    () => (step ? parseStepVariables(step.variables) : { variables: [], namespaces: [] }),
    [step]
  );

  return (
    <FormField
      control={control}
      name={subjectKey}
      render={({ field, fieldState }) => (
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
                namespaces={namespaces}
              />
            </InputRoot>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
