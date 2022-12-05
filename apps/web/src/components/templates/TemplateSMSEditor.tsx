import { Control, Controller, useFormContext } from 'react-hook-form';
import { LackIntegrationError } from './LackIntegrationError';
import { IForm } from './use-template-controller.hook';
import { Textarea } from '../../design-system';
import { useEnvController } from '../../store/use-env-controller';
import { VariableManager } from './VariableManager';
import { useVariablesManager } from '../../hooks/use-variables-manager';

export function TemplateSMSEditor({
  control,
  index,
  isIntegrationActive,
}: {
  control: Control<IForm>;
  index: number;
  errors: any;
  isIntegrationActive: boolean;
}) {
  const { readonly } = useEnvController();
  const {
    formState: { errors },
  } = useFormContext();
  const variablesArray = useVariablesManager(index, ['content']);

  return (
    <>
      {!isIntegrationActive ? <LackIntegrationError channelType="SMS" /> : null}
      <Controller
        name={`steps.${index}.template.content` as any}
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="smsNotificationContent"
            error={errors?.steps ? errors.steps[index]?.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="SMS message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager index={index} variablesArray={variablesArray} />
    </>
  );
}
