import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Grid, SegmentedControl, Stack, useMantineTheme } from '@mantine/core';
import { useState } from 'react';

import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import type { IForm } from '../formTypes';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { CustomCodeEditor } from '../CustomCodeEditor';
import { ChatPreview } from '../../../../components/workflow/preview';

import { EditVariablesModal } from '../EditVariablesModal';
import { VariableManagementButton } from '../VariableManagementButton';
import { useEditTemplateContent } from '../../hooks/useEditTemplateContent';
import { useTemplateEditorForm } from '../TemplateEditorFormProvider';
import { colors, When } from '@novu/design-system';
import { InputVariables } from '../InputVariables';
import { InputVariablesForm } from '../InputVariablesForm';

const templateFields = ['content'];

const PREVIEW = 'Preview';
const INPUTS = 'Inputs';

export function TemplateChatEditor() {
  const { isPreviewLoading, handleContentChange } = useEditTemplateContent();
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.CHAT,
  });
  const [inputVariables, setInputVariables] = useState();
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const { template } = useTemplateEditorForm();
  const { chimera } = useEnvController({}, template?.chimera);
  const [activeTab, setActiveTab] = useState<string>(PREVIEW);
  const theme = useMantineTheme();

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.CHAT} /> : null}
      <StepSettings />
      <Grid>
        <Grid.Col span={6}>
          <Controller
            name={`${stepFormPath}.template.content`}
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
                  <InputVariablesForm onChange={setInputVariables} />
                </When>
              </Stack>
            )}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <ChatPreview inputVariables={inputVariables} showLoading={isPreviewLoading} />
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
