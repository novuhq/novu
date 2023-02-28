import { Control, Controller, useFormContext } from 'react-hook-form';

import { LackIntegrationError } from './LackIntegrationError';
import type { IForm } from './formTypes';
import { Textarea } from '../../../design-system';
import { useEnvController, useVariablesManager } from '../../../hooks';
import { VariableManager } from './VariableManager';

const templateFields = ['content'];

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
  const variablesArray = useVariablesManager(index, templateFields);

  return (
    <>
      {!isIntegrationActive ? <LackIntegrationError channelType="SMS" /> : null}
      <Controller
        name={`steps.${index}.template.content` as any}
        defaultValue=""
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
