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

export function TemplateVoiceEditor() {
  const { readonly } = useEnvController();
  const stepFormPath = useStepFormPath();
  const stepFormErrors = useStepFormErrors();
  const { control } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.VOICE,
  });

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.VOICE} /> : null}
      <StepSettings />
      <Controller
        name={`${stepFormPath}.template.content`}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="voiceNotificationContent"
            error={stepFormErrors ? stepFormErrors?.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={(field.value as string) || ''}
            label="Voice message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager variablesArray={variablesArray} path={`${stepFormPath}.template`} />
      <TranslateProductLead id="translate-voice-editor" />
    </>
  );
}
