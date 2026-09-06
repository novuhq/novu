import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useStepEditor } from '@/components/workflow-editor/steps/context/step-editor-context';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { capitalize } from '@/utils/string';
import { InputRoot } from '../../../primitives/input';

const subjectKey = 'subject';

export const BaseSubject = () => {
  const { control } = useFormContext();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const { isReadOnly } = useStepEditor();

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
                isAllowedVariable={isAllowedVariable}
                enableTranslations
                readOnly={isReadOnly}
              />
            </InputRoot>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};
