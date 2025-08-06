import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { capitalize, containsHTMLEntities, containsVariables } from '@/utils/string';
import { InputRoot } from '../../../primitives/input';

const bodyKey = 'body';

function getFormMessage(
  fieldValue: string,
  isOutputSanitizationDisabled: boolean,
  isTranslationEnabled: boolean
): string {
  if (containsHTMLEntities(fieldValue) && !isOutputSanitizationDisabled) {
    return 'HTML entities detected. Consider disabling content sanitization for proper rendering';
  }

  const hints = ['Type {{ to access variables, or wrap text in ** for bold.'];

  if (isTranslationEnabled) {
    hints.push('Type {{t. to access translation keys.');

    return hints.join(' ');
  }

  return '';
}

export const InAppBody = () => {
  const { control, getValues } = useFormContext();
  const { step, digestStepBeforeCurrent, workflow } = useWorkflow();
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
                indentWithTab={false}
                placeholder={capitalize(field.name)}
                id={field.name}
                value={field.value}
                onChange={field.onChange}
                variables={variables}
                isAllowedVariable={isAllowedVariable}
                multiline
                enableTranslations
              />
            </InputRoot>
          </FormControl>
          <FormMessage>
            {getFormMessage(
              field.value,
              getValues('disableOutputSanitization'),
              workflow?.isTranslationEnabled || false
            )}
          </FormMessage>
        </FormItem>
      )}
    />
  );
};
