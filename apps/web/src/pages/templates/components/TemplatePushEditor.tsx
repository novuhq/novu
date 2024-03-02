import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { colors, Text, When } from '@novu/design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../hooks';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { StepSettings } from '../workflow/SideBar/StepSettings';
import { LackIntegrationAlert } from './LackIntegrationAlert';

import { Flex, Grid, SegmentedControl, Stack, useMantineTheme } from '@mantine/core';
import { useState } from 'react';
import { PushPreview } from '../../../components/workflow/preview';
import { useEditTemplateContent } from '../hooks/useEditTemplateContent';
import { CustomCodeEditor } from './CustomCodeEditor';
import { EditVariablesModal } from './EditVariablesModal';
import { VariableManagementButton } from './VariableManagementButton';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { InputVariables } from './InputVariables';
import { InputVariablesForm } from './InputVariablesForm';

const templateFields = ['content', 'title'];

const PREVIEW = 'Preview';
const INPUTS = 'Inputs';

export function TemplatePushEditor() {
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext();
  const variablesArray = useVariablesManager(templateFields);
  const [inputVariables, setInputVariables] = useState();

  const { isPreviewLoading, handleContentChange } = useEditTemplateContent();
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.PUSH,
  });
  const { template } = useTemplateEditorForm();
  const { chimera } = useEnvController({}, template?.chimera);
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
        {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.PUSH} /> : null}
        <StepSettings />

        <Grid gutter={24}>
          <Grid.Col span={'auto'}>
            <Stack spacing={32}>
              <Controller
                name={`${stepFormPath}.template.title` as any}
                defaultValue=""
                control={control}
                render={({ field }) => (
                  <Stack spacing={8} data-test-id="push-title-container">
                    <VariableManagementButton
                      openEditVariablesModal={() => {
                        setEditVariablesModalOpen(true);
                      }}
                      label={chimera ? 'Input variables' : 'Title'}
                    />
                    <When truthy={!chimera}>
                      <CustomCodeEditor
                        value={(field.value as string) || ''}
                        onChange={(value) => {
                          handleContentChange(value, field.onChange);
                        }}
                        height="128px"
                      />
                    </When>
                    <When truthy={chimera}>
                      <InputVariables onChange={setInputVariables} onSubmit={setInputVariables} />
                    </When>
                  </Stack>
                )}
              />
              <When truthy={!chimera}>
                <Controller
                  name={`${stepFormPath}.template.content` as any}
                  defaultValue=""
                  control={control}
                  render={({ field }) => (
                    <Stack spacing={8} data-test-id="push-content-container">
                      <Text weight="bold">Message</Text>
                      <CustomCodeEditor
                        value={(field.value as string) || ''}
                        onChange={(value) => {
                          handleContentChange(value, field.onChange);
                        }}
                      />
                    </Stack>
                  )}
                />
              </When>
            </Stack>
            <EditVariablesModal
              open={editVariablesModalOpened}
              setOpen={setEditVariablesModalOpen}
              variablesArray={variablesArray}
            />
          </Grid.Col>
          <Grid.Col span={'content'}>
            <Flex justify="center">
              <PushPreview inputVariables={inputVariables} showLoading={isPreviewLoading} showOverlay={false} />
            </Flex>
          </Grid.Col>
        </Grid>
      </When>
    </>
  );
}
