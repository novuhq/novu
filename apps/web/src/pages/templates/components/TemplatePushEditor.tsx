import { Control, Controller, useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { LackIntegrationAlert } from './LackIntegrationAlert';
import type { IForm } from './formTypes';
import { Textarea } from '../../../design-system';
import { useEnvController, useVariablesManager } from '../../../hooks';
import { VariableManager } from './VariableManager';
import { StepSettings } from '../workflow/SideBar/StepSettings';

const templateFields = ['content', 'title'];

export function TemplatePushEditor({
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
      {!isIntegrationActive ? (
        <LackIntegrationAlert channelType={ChannelTypeEnum.PUSH} iconHeight={34} iconWidth={34} />
      ) : null}
      <StepSettings index={index} />
      <Controller
        name={`steps.${index}.template.title` as any}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="pushNotificationTitle"
            error={errors?.steps ? errors.steps[index]?.template?.title?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="Push message title"
            placeholder="Add notification title here..."
          />
        )}
      />
      <Controller
        name={`steps.${index}.template.content` as any}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="pushNotificationContent"
            error={errors?.steps ? errors.steps[index]?.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="Push message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager index={index} variablesArray={variablesArray} />
    </>
  );
}
