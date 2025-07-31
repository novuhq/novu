import { EnvironmentTypeEnum } from '@novu/shared';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormMessage } from '@/components/primitives/form/form';
import { ControlInput } from '@/components/workflow-editor/control-input';
import { useWorkflow } from '@/components/workflow-editor/workflow-provider';
import { useEnvironment } from '@/context/environment/hooks';
import { useParseVariables } from '@/hooks/use-parse-variables';
import { capitalize, containsHTMLEntities } from '@/utils/string';
import { cn } from '@/utils/ui';

const subjectKey = 'subject';

export const EmailSubject = () => {
  const { control, getValues } = useFormContext();
  const { step, digestStepBeforeCurrent } = useWorkflow();
  const { variables, isAllowedVariable } = useParseVariables(step?.variables, digestStepBeforeCurrent?.stepId);
  const { currentEnvironment } = useEnvironment();

  return (
    <FormField
      control={control}
      name={subjectKey}
      render={({ field }) => (
        <>
          <FormItem className="w-full">
            <FormControl>
              <ControlInput
                className={cn('px-0')}
                size="md"
                indentWithTab={false}
                autoFocus={!field.value}
                placeholder={capitalize(field.name)}
                id={field.name}
                variables={variables}
                isAllowedVariable={isAllowedVariable}
                value={field.value}
                onChange={(val) => field.onChange(val)}
                enableTranslations
                disabled={currentEnvironment?.type !== EnvironmentTypeEnum.DEV}
              />
            </FormControl>
            <FormMessage className="mb-2">
              {containsHTMLEntities(field.value) &&
                !getValues('disableOutputSanitization') &&
                'HTML entities detected. Consider disabling content sanitization for proper rendering'}
            </FormMessage>
          </FormItem>
        </>
      )}
    />
  );
};
