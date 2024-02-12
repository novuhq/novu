import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Textarea } from '@novu/design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
import { useStepFormErrors } from '../../hooks/useStepFormErrors';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import type { IForm } from '../formTypes';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { VariableManager } from '../VariableManager';
import { TranslateProductLead } from '../TranslateProductLead';

const templateFields = ['content'];

export function TemplateChatEditor() {
  const { readonly } = useEnvController();
  const stepFormPath = useStepFormPath();
  const stepFormErrors = useStepFormErrors();
  const { control } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.CHAT,
  });

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.CHAT} /> : null}
      <StepSettings />
      <Controller
        name={`${stepFormPath}.template.content`}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="chatNotificationContent"
            error={stepFormErrors ? stepFormErrors?.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={(field.value as string) || ''}
            label="Chat message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager variablesArray={variablesArray} path={`${stepFormPath}.template`} />
      <TranslateProductLead id="translate-chat-editor" />
    </>
  );
}
