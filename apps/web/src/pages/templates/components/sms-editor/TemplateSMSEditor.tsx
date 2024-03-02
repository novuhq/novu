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
import { Grid, SegmentedControl, Stack, useMantineTheme } from '@mantine/core';
import { VariableManagementButton } from '../VariableManagementButton';
import { CustomCodeEditor } from '../CustomCodeEditor';
import { SmsPreview } from '../../../../components/workflow/preview';
import { EditVariablesModal } from '../EditVariablesModal';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';
import { colors, When } from '@novu/design-system';
import { InputVariables } from '../InputVariables';
import { InputVariablesForm } from '../InputVariablesForm';

const templateFields = ['content'];
const PREVIEW = 'Preview';
const INPUTS = 'Inputs';

export function TemplateSMSEditor() {
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const { template } = useTemplateEditorForm();
  const { environment, chimera } = useEnvController({}, template?.chimera);
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
  const [inputVariables, setInputVariables] = useState();
  const [activeTab, setActiveTab] = useState<string>(PREVIEW);
  const theme = useMantineTheme();

  return (
    <>
      <When truthy={chimera}>
        <SegmentedControl
          data-test-id="editor-mode-switch"
          styles={{
            root: {
              background: 'transparent',
              border: `1px solid ${theme.colorScheme === 'dark' ? colors.B40 : colors.B70}`,
              borderRadius: '30px',
              width: '100%',
              maxWidth: '300px',
            },
            label: {
              fontSize: '14px',
              lineHeight: '24px',
            },
            control: {
              minWidth: '80px',
            },
            active: {
              background: theme.colorScheme === 'dark' ? colors.B40 : colors.B98,
              borderRadius: '30px',
            },
            labelActive: {
              color: `${theme.colorScheme === 'dark' ? colors.white : colors.B40} !important`,
              fontSize: '14px',
              lineHeight: '24px',
            },
          }}
          data={[PREVIEW, INPUTS]}
          value={activeTab}
          onChange={(value) => {
            setActiveTab(value);
          }}
          defaultValue={activeTab}
          fullWidth
          radius={'xl'}
        />
      </When>
      <When truthy={activeTab === INPUTS}>
        <InputVariablesForm />
      </When>
      <When truthy={activeTab === PREVIEW}>
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
                    label={chimera ? 'Input variables' : undefined}
                  />
                  <When truthy={!chimera}>
                    <CustomCodeEditor
                      value={(field.value as string) || ''}
                      onChange={(value) => {
                        handleContentChange(value, field.onChange);
                      }}
                    />
                  </When>
                  <When truthy={chimera}>
                    <InputVariables onChange={setInputVariables} onSubmit={setInputVariables} />
                  </When>
                </Stack>
              )}
            />
          </Grid.Col>
          <Grid.Col span={'content'}>
            <SmsPreview inputVariables={inputVariables} showPreviewAsLoading={isPreviewLoading} />
          </Grid.Col>
        </Grid>
        <EditVariablesModal
          open={editVariablesModalOpened}
          setOpen={setEditVariablesModalOpen}
          variablesArray={variablesArray}
        />
      </When>
    </>
  );
}
