import { Controller, useFormContext } from 'react-hook-form';
import { ChannelTypeEnum } from '@novu/shared';

import { useState } from 'react';
import { Grid, SegmentedControl, Stack, useMantineTheme } from '@mantine/core';
import { When } from '@novu/design-system';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import {
  useEnvironment,
  useHasActiveIntegrations,
  useGetPrimaryIntegration,
  useVariablesManager,
} from '../../../../hooks';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { useEditTemplateContent } from '../../hooks/useEditTemplateContent';
import { VariableManagementButton } from '../VariableManagementButton';
import { CustomCodeEditor } from '../CustomCodeEditor';
import { SmsPreview } from '../../../../components/workflow/preview';
import { EditVariablesModal } from '../EditVariablesModal';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';
import { ControlVariablesForm } from '../ControlVariablesForm';

const templateFields = ['content'];

export function TemplateSMSEditor() {
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const { template } = useTemplateEditorForm();
  const { environment, bridge } = useEnvironment({ bridge: template?.bridge });
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
  const [controlVariables, setControlVariables] = useState();

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.SMS} /> : null}
      {hasActiveIntegration && !primaryIntegration ? (
        <LackIntegrationAlert
          channelType={ChannelTypeEnum.SMS}
          text={
            `You have multiple provider instances for SMS in the ${environment?.name} environment.` +
            ` Please select the primary instance.`
          }
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
                  label={bridge ? 'Control variables' : undefined}
                />
                <When truthy={!bridge}>
                  <CustomCodeEditor
                    value={(field.value as string) || ''}
                    onChange={(value) => {
                      handleContentChange(value, field.onChange);
                    }}
                  />
                </When>
                <When truthy={bridge}>
                  <ControlVariablesForm
                    onChange={(values) => {
                      setControlVariables(values);
                    }}
                  />
                </When>
              </Stack>
            )}
          />
        </Grid.Col>
        <Grid.Col span={'content'}>
          <SmsPreview controlVariables={controlVariables} showPreviewAsLoading={isPreviewLoading} />
        </Grid.Col>
      </Grid>
      <EditVariablesModal
        open={editVariablesModalOpened}
        setOpen={setEditVariablesModalOpen}
        variablesArray={variablesArray}
      />
    </>
  );
}
