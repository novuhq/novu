import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Grid, SegmentedControl, Stack, useMantineTheme } from '@mantine/core';
import { useState } from 'react';

import { When } from '@novu/design-system';
import { useEnvironment, useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
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
import { ControlVariablesForm } from '../ControlVariablesForm';

const templateFields = ['content'];

export function TemplateChatEditor() {
  const { isPreviewLoading, handleContentChange } = useEditTemplateContent();
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.CHAT,
  });
  const [controlVariables, setControlVariables] = useState();
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const { template } = useTemplateEditorForm();
  const { bridge } = useEnvironment({ bridge: template?.bridge });

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
                  <ControlVariablesForm onChange={setControlVariables} />
                </When>
              </Stack>
            )}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <ChatPreview controlVariables={controlVariables} showLoading={isPreviewLoading} />
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
