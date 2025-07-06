import { useFormContext } from 'react-hook-form';

import { ControlInput } from '@/components/workflow-editor/control-input';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { capitalize } from '@/utils/string';
import { InputRoot } from '../../../primitives/input';

const bodyKey = 'body';

export const BaseBody = () => {
  const { control } = useFormContext();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);

  return (
    <FormField
      control={control}
      name={bodyKey}
      render={({ field, fieldState }) => (
        <FormItem className="w-full">
          <FormControl>
            <InputRoot hasError={!!fieldState.error}>
              <ControlInput
                className="min-h-[7rem]"
                placeholder={capitalize(field.name)}
                id={field.name}
                variables={variables}
                isAllowedVariable={isAllowedVariable}
                value={field.value}
                multiline
                onChange={field.onChange}
                enableTranslations
              />
            </InputRoot>
          </FormControl>
          <FormMessage>{`You can use variables by typing {{ select from the list or create a new one.`}</FormMessage>
        </FormItem>
      )}
    />
  );
};
