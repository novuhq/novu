import { Controller, useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';
import { Textarea } from '@novu/design-system';

import { LackIntegrationAlert } from './LackIntegrationAlert';
import {
  useEnvController,
  useHasActiveIntegrations,
  useGetPrimaryIntegration,
  useVariablesManager,
} from '../../../hooks';
import { VariableManager } from './VariableManager';
import { StepSettings } from '../workflow/SideBar/StepSettings';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { TranslateProductLead } from './TranslateProductLead';

const templateFields = ['content'];

export function TemplateSMSEditor() {
  const { readonly, environment } = useEnvController();
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.SMS,
  });
  const { primaryIntegration } = useGetPrimaryIntegration({
    channelType: ChannelTypeEnum.SMS,
  });

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.SMS} /> : null}
      {hasActiveIntegration && !primaryIntegration ? (
        <LackIntegrationAlert
          channelType={ChannelTypeEnum.SMS}
          text={`You have multiple provider instances for SMS in the ${environment?.name} environment. Please select the primary instance.`}
          isPrimaryMissing
        />
      ) : null}
      <StepSettings />
      <Controller
        name={`${stepFormPath}.template.content` as any}
        defaultValue=""
        control={control}
        render={({ field, fieldState }) => (
          <Textarea
            {...field}
            data-test-id="smsNotificationContent"
            error={fieldState.error?.message}
            disabled={readonly}
            minRows={4}
            value={field.value || ''}
            label="SMS message content"
            placeholder="Add notification content here..."
          />
        )}
      />
      <VariableManager variablesArray={variablesArray} path={`${stepFormPath}.template`} />
      <TranslateProductLead id="translate-sms-editor" />
    </>
  );
}
