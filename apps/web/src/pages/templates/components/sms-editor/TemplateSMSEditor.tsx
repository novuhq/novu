import { Controller, useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { LackIntegrationAlert } from '../LackIntegrationAlert';
import {
  useEnvController,
  useHasActiveIntegrations,
  useGetPrimaryIntegration,
  useVariablesManager,
} from '../../../../hooks';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { useState } from 'react';
import { useEditTemplateContent } from '../../hooks/useEditTemplateContent';
import { Grid, Stack } from '@mantine/core';
import { VariableManagementButton } from '../VariableManagementButton';
import { CustomCodeEditor } from '../CustomCodeEditor';
import { SmsPreview } from '../../../../components/workflow/preview';
import { EditVariablesModal } from '../EditVariablesModal';

const templateFields = ['content'];

export function TemplateSMSEditor() {
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const { environment } = useEnvController();
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.SMS,
  });
  const { primaryIntegration } = useGetPrimaryIntegration({
    channelType: ChannelTypeEnum.SMS,
  });
  const { isPreviewLoading, handleContentChange } = useEditTemplateContent();

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
      <Grid gutter={24}>
        <Grid.Col span={'auto'}>
          <Controller
            name={`${stepFormPath}.template.content` as any}
            defaultValue=""
            control={control}
            render={({ field }) => (
              <Stack spacing={8}>
                <VariableManagementButton
                  openEditVariablesModal={() => {
                    setEditVariablesModalOpen(true);
                  }}
                />
                <CustomCodeEditor
                  value={(field.value as string) || ''}
                  onChange={(value) => {
                    handleContentChange(value, field.onChange);
                  }}
                />
              </Stack>
            )}
          />
        </Grid.Col>
        <Grid.Col span={'content'}>
          <SmsPreview showPreviewAsLoading={isPreviewLoading} />
        </Grid.Col>
      </Grid>
      <EditVariablesModal
        open={editVariablesModalOpened}
        setOpen={setEditVariablesModalOpen}
        variablesArray={variablesArray}
      />
      ]
    </>
  );
}
