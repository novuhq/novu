import { Stack } from '@mantine/core';
import { useState } from 'react';
import { Control, Controller, useFormContext } from 'react-hook-form';

import { ChannelTypeEnum } from '@novu/shared';
import { Input } from '../../../../design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import type { IForm, ITemplates } from '../formTypes';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { VariableManagerModal } from '../VariableManagerModal';
import { InAppContentCard } from './InAppContentCard';

const getVariableContents = (template: ITemplates) => {
  const baseContent = ['content'];

  if (template.cta?.data?.url) {
    baseContent.push('cta.data.url');
  }

  template.cta?.action?.buttons?.forEach((_button, ind) => {
    baseContent.push(`cta.action.buttons.${ind}.content`);
  });

  return baseContent;
};

export function TemplateInAppEditor({ control, index }: { control: Control<IForm>; index: number; errors: any }) {
  const { readonly } = useEnvController();
  const { watch } = useFormContext<IForm>();
  const [modalOpen, setModalOpen] = useState(false);

  const template = watch(`steps.${index}.template`);
  const variableContents = getVariableContents(template);

  const variablesArray = useVariablesManager(index, variableContents);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.IN_APP,
  });

  return (
    <>
      {!hasActiveIntegration && <LackIntegrationAlert channelType={ChannelTypeEnum.IN_APP} />}
      <StepSettings index={index} />
      <Stack spacing={24}>
        <Controller
          name={`steps.${index}.template.cta.data.url` as any}
          defaultValue=""
          control={control}
          render={({ field, fieldState }) => (
            <Input
              {...field}
              error={fieldState.error?.message}
              value={field.value || ''}
              disabled={readonly}
              data-test-id="inAppRedirect"
              label="Redirect URL"
              placeholder="i.e /tasks/{{taskId}}"
            />
          )}
        />
        <InAppContentCard
          index={index}
          openVariablesModal={() => {
            setModalOpen(true);
          }}
        />
      </Stack>

      <VariableManagerModal open={modalOpen} setOpen={setModalOpen} index={index} variablesArray={variablesArray} />
    </>
  );
}
