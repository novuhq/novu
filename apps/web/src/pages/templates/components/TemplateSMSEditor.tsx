import { Control, Controller, useFormContext, useWatch } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { LackIntegrationError } from './LackIntegrationError';
import type { IForm } from './formTypes';
import { Textarea } from '../../../design-system';
import { useEnvController, useVariablesManager } from '../../../hooks';
import { VariableManager } from './VariableManager';
import { StepSettings } from '../workflow/SideBar/StepSettings';
import { AIAutocomplete } from './ai-autocomplete/AiAutocomplete';

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
    watch,
  } = useFormContext();
  const title = watch(`steps.${index}.name`);
  const channel = watch(`steps.${index}.template.type`);
  const variablesArray = useVariablesManager(index, templateFields);

  return (
    <>
      {!isIntegrationActive ? (
        <LackIntegrationError channelType={ChannelTypeEnum.SMS} iconHeight={34} iconWidth={34} />
      ) : null}
      <StepSettings index={index} />
      <Controller
        name={`steps.${index}.template.content` as any}
        defaultValue=""
        control={control}
        render={({ field }) => (
          <AIAutocomplete
            title={title}
            channel={channel}
            type="textarea"
            disabled={readonly}
            label="SMS message content"
            placeholder="Write a message content here..."
            error={errors?.steps ? errors.steps[index]?.template?.content?.message : undefined}
            {...field}
          />
        )}
      />

      <VariableManager index={index} variablesArray={variablesArray} />
    </>
  );
}
