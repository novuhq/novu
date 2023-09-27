import { Control, Controller, useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { LackIntegrationAlert } from './LackIntegrationAlert';
import type { IForm } from './formTypes';
import { Textarea } from '../../../design-system';
import {
  useEnvController,
  useHasActiveIntegrations,
  useGetPrimaryIntegration,
  useVariablesManager,
} from '../../../hooks';
import { VariableManager } from './VariableManager';
import { StepSettings } from '../workflow/SideBar/StepSettings';

const templateFields = ['content'];

export function TemplateSMSEditor({
  control,
  index,
  variantIndex,
}: {
  control: Control<IForm>;
  index: number;
  variantIndex?: number;
  errors: any;
}) {
  const { readonly, environment } = useEnvController();
  const path = variantIndex ? `steps.${index}.variants.${variantIndex}` : `steps.${index}`;
  const {
    formState: { errors },
  } = useFormContext();
  const variablesArray = useVariablesManager(index, templateFields);
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
      <StepSettings path={path} index={index} />
      <Controller
        name={`${path}.template.content` as any}
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
      <VariableManager index={index} variablesArray={variablesArray} />
    </>
  );
}
