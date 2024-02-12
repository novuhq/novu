import { ChannelTypeEnum } from '@novu/shared';
import { Controller, useFormContext } from 'react-hook-form';
import { Grid } from '@mantine/core';
import { useState } from 'react';
import { useTimeout } from '@mantine/hooks';

import { useHasActiveIntegrations, useVariablesManager } from '../../../../hooks';
import { useStepFormPath } from '../../hooks/useStepFormPath';
import { StepSettings } from '../../workflow/SideBar/StepSettings';
import type { IForm } from '../formTypes';
import { LackIntegrationAlert } from '../LackIntegrationAlert';
import { CustomCodeEditor, CustomCodeEditorWrapper } from '../CustomCodeEditor';
import { ChatPreview } from '../../../../components/workflow/Preview';

import { VariableManagerModal } from '../VariableManagerModal';

const templateFields = ['content'];

export function TemplateChatEditor() {
  const [showLoading, setShowLoading] = useState(false);
  const stepFormPath = useStepFormPath();
  const { control } = useFormContext<IForm>();
  const variablesArray = useVariablesManager(templateFields);
  const { hasActiveIntegration } = useHasActiveIntegrations({
    channelType: ChannelTypeEnum.CHAT,
  });
  const [variablesModalOpened, setVariablesModalOpen] = useState(false);

  const { start, clear } = useTimeout(() => setShowLoading(false), 1000);

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
              <CustomCodeEditorWrapper
                onChange={(value) => {
                  setShowLoading(true);
                  clear();
                  field.onChange(value);
                  start();
                }}
                value={(field.value as string) || ''}
                openVariablesModal={() => {
                  setVariablesModalOpen(true);
                }}
              />
            )}
          />
        </Grid.Col>
        <Grid.Col span={6}>
          <ChatPreview showLoading={showLoading} />
        </Grid.Col>
      </Grid>
      <VariableManagerModal
        open={variablesModalOpened}
        setOpen={setVariablesModalOpen}
        variablesArray={variablesArray}
      />
    </>
  );
}
