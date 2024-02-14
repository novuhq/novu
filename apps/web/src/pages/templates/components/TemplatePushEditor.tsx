import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';

import { Text } from '@novu/design-system';
import { useEnvController, useHasActiveIntegrations, useVariablesManager } from '../../../hooks';
import { useStepFormErrors } from '../hooks/useStepFormErrors';
import { useStepFormPath } from '../hooks/useStepFormPath';
import { StepSettings } from '../workflow/SideBar/StepSettings';
import { LackIntegrationAlert } from './LackIntegrationAlert';

import { TranslateProductLead } from './TranslateProductLead';
import { Grid, Stack } from '@mantine/core';
import { CustomCodeEditor } from './CustomCodeEditor';
import { VariableManagementButton } from './VariableManagementButton';
import { useState } from 'react';
import { useTimeout } from '@mantine/hooks';
import { EditVariablesModal } from './EditVariablesModal';
import { useEditTemplateContent } from '../hooks/useEditTemplateContent';
import { PushPreview } from '../../../components/workflow/preview';

const templateFields = ['content', 'title'];

export function TemplatePushEditor() {
  const [editVariablesModalOpened, setEditVariablesModalOpen] = useState(false);
  const [showLoading, setShowLoading] = useState(false);

  const { readonly } = useEnvController();
  const stepFormPath = useStepFormPath();
  const stepFormErrors = useStepFormErrors();
  const { control } = useFormContext();
  const variablesArray = useVariablesManager(templateFields);

  const { isPreviewLoading, handleContentChange } = useEditTemplateContent();
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.PUSH,
  });

  return (
    <>
      {!hasActiveIntegration ? <LackIntegrationAlert channelType={ChannelTypeEnum.PUSH} /> : null}
      <StepSettings />

      <Grid>
        <Grid.Col span={6}>
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
                    label="Title"
                  />
                  <CustomCodeEditor
                    value={(field.value as string) || ''}
                    onChange={(value) => {
                      handleContentChange(value, field.onChange);
                    }}
                    height="128px"
                  />
                </Stack>
              )}
            />
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
          </Stack>
          <EditVariablesModal
            open={editVariablesModalOpened}
            setOpen={setEditVariablesModalOpen}
            variablesArray={variablesArray}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <PushPreview showLoading={isPreviewLoading} />
        </Grid.Col>
      </Grid>
      <TranslateProductLead id="translate-push-editor" />
    </>
  );
}
