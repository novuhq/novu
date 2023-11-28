import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Textarea } from '@novu/design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../hooks';
import { useStepFormErrors } from '../hooks/useStepFormErrors';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { StepSettings } from '../workflow/SideBar/StepSettings';
import { LackIntegrationAlert } from './LackIntegrationAlert';
import { VariableManager } from './VariableManager';
import { TranslateProductLead } from './TranslateProductLead';

const templateFields = ['content', 'title'];

export function TemplatePushEditor() {
  const { readonly } = useEnvController();
  const stepFormPath = useStepFormPath();
  const stepFormErrors = useStepFormErrors();
  const { control } = useFormContext();
  const variablesArray = useVariablesManager(templateFields);

  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.PUSH,
  });

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.PUSH} /> : null}
      <StepSettings />
      <Controller
        name={`${stepFormPath}.template.title` as any}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="pushNotificationTitle"
            error={stepFormErrors ? stepFormErrors.template?.title?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="Push message title"
            placeholder="Add notification title here..."
          />
        )}
      />
      <Controller
        name={`${stepFormPath}.template.content` as any}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <Textarea
            {...field}
            data-test-id="pushNotificationContent"
            error={stepFormErrors ? stepFormErrors.template?.content?.message : undefined}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="Push message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager variablesArray={variablesArray} path={`${stepFormPath}.template`} />
      <TranslateProductLead id="translate-push-editor" />
    </>
  );
}
