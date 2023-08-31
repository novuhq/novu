import { ChannelTypeEnum } from '@novu/shared';
import { Control, Controller, useFormContext } from 'react-hook-form';

import { Textarea } from '../../../../design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import type { IForm } from '../formTypes';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { VariableManager } from '../VariableManager';

const templateFields = ['content'];

export function TemplateChatEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const { readonly } = useEnvController();
  const {
    formState: { errors },
  } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(index, templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.CHAT,
  });

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.CHAT} /> : null}
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
