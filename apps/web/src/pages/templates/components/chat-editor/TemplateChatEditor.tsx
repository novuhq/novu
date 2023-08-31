import { Control, Controller, useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { useEnvController, useVariablesManager } from '../../../../hooks';
import type { IForm } from '../formTypes';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { Textarea } from '../../../../design-system';
import { VariableManager } from '../VariableManager';
import { StepSettings } from '../../workflow/SideBar/StepSettings';

const templateFields = ['content'];

export function TemplateChatEditor({
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
  } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(index, templateFields);

  return (
    <>
      {!isIntegrationActive ? (
        <LackIntegrationAlert channelType={ChannelTypeEnum.CHAT} iconHeight={34} iconWidth={34} />
      ) : null}
      <StepSettings index={index} />
      <Controller
        name={`steps.${index}.template.content`}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="chatNotificationContent"
            error={errors?.steps ? errors.steps[index]?.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={(field.value as string) || ''}
            label="Chat message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager index={index} variablesArray={variablesArray} />
    </>
  );
}
