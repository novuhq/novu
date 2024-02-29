import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Text, When } from '@novu/design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../hooks';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { StepSettings } from '../workflow/SideBar/StepSettings';
import { LackIntegrationAlert } from './LackIntegrationAlert';

import { Flex, Grid, Stack } from '@mantine/core';
import { useState } from 'react';
import { PushPreview } from '../../../components/workflow/preview';
import { useEditTemplateContent } from '../hooks/useEditTemplateContent';
import { CustomCodeEditor } from './CustomCodeEditor';
import { EditVariablesModal } from './EditVariablesModal';
import { VariableManagementButton } from './VariableManagementButton';
import { useTemplateEditorForm } from './TemplateEditorFormProvider';
import { InputVariables } from './InputVariables';

const templateFields = ['content', 'title'];

export function TemplatePushEditor() {
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext();
  const variablesArray = useVariablesManager(templateFields);

  const { isPreviewLoading, handleContentChange } = useEditTemplateContent();
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.PUSH,
  });
  const { template } = useTemplateEditorForm();
  const { chimera } = useEnvController({}, template?.chimera);

  return (
    <>
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
                    <InputVariables />
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
            <PushPreview showLoading={isPreviewLoading} showOverlay={false} />
          </Flex>
        </Grid.Col>
      </Grid>
    </>
  );
}
