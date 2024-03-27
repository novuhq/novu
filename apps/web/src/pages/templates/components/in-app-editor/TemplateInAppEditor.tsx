import { Stack } from '@mantine/core';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import { ChannelTypeEnum } from '@novu/shared';
import { Input } from '@novu/design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { EditVariablesModal } from '../EditVariablesModal';
import { InAppContentCard } from './InAppContentCard';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import type { IForm, ITemplates } from '../formTypes';
import { When } from '../../../../components/utils/When';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';

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

export function TemplateInAppEditor() {
  const { template } = useTemplateEditorForm();
  const { readonly, chimera } = useEnvController({}, template?.chimera);
  const { control, watch } = useFormContext<IForm>();
  const [modalOpen, setModalOpen] = useState(false);
  const stepFormPath = useStepFormPath();
  const contents = getVariableContents(watch(`${stepFormPath}.template`));
  const variablesArray = useVariablesManager(contents);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.IN_APP,
  });

  return (
    <>
      {!hasActiveIntegration && <LackIntegrationAlert channelType={ChannelTypeEnum.IN_APP} />}
      <StepSettings />
      <Stack spacing={24}>
        <When truthy={!chimera}>
          <Controller
            name={`${stepFormPath}.template.cta.data.url` as any}
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
        </When>
        <InAppContentCard
          openVariablesModal={() => {
            setModalOpen(true);
          }}
        />
      </Stack>
      <EditVariablesModal open={modalOpen} setOpen={setModalOpen} variablesArray={variablesArray} />
    </>
  );
}
