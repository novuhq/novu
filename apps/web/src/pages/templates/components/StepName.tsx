import { useState } from 'react';
import { Group } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { When } from '../../../components/utils/When';
import { GenerateContentButton } from './GenerateContentButton';
import { UpdateButton } from './UpdateButton';
import { StepNameInput } from './StepNameInput';
import { stepIcon, stepNames } from '../constants';
import { GenerateContentContextModal } from './GenerateContentContextModal';
import { useGenerateContentWithAI } from './useGenerateContentWithAI';
import { usePrepareAIContext } from './usePrepareAIContext';

export const StepName = ({
  channel,
  color = undefined,
  index,
}: {
  channel: StepTypeEnum | ChannelTypeEnum;
  index: number;
  color?: any;
}) => {
  const [generateContentInChatGpt, setGenerateContentInChatGpt] = useState(false);
  const [isGeneratingContentInChatGpt, setIsGeneratingContentInChatGpt] = useState(false);
  const { context, setContext, workflow } = usePrepareAIContext(index);

  const { fetchingError, setFetchingError, fetchGenerateContentWithAI } = useGenerateContentWithAI(
    channel,
    context,
    workflow
  );

  const workflowContext = {
    channel,
    context,
    workflow,
  };

  const onContextChange = (event) => {
    const { value } = event.target;
    setContext(value);
  };

  const confirmGenerateContentInChatGpt = async () => {
    try {
      setIsGeneratingContentInChatGpt(true);
      setFetchingError(undefined);
      const result = await fetchGenerateContentWithAI();
      setIsGeneratingContentInChatGpt(false);
      setGenerateContentInChatGpt(false);
    } catch (e: any) {
      setIsGeneratingContentInChatGpt(false);
      setFetchingError(e?.message || 'Unknown error');
    }
  };

  const cancelGenerateContentInChatGpt = () => {
    setGenerateContentInChatGpt(false);
    setIsGeneratingContentInChatGpt(false);
  };

  const onGenerateContent = () => {
    setFetchingError(undefined);
    setGenerateContentInChatGpt(true);
  };

  const Icon = stepIcon[channel];

  return (
    <>
      <Group spacing={16}>
        <Icon color={color} /> <StepNameInput defaultValue={stepNames[channel]} index={index} />
        <When truthy={['in_app', 'email'].includes(channel)}>
          <div
            style={{
              marginRight: 32,
            }}
          >
            <GenerateContentButton onClick={onGenerateContent} />
            &nbsp;
            <UpdateButton />
          </div>
        </When>
      </Group>
      <GenerateContentContextModal
        workflowContext={workflowContext}
        isOpen={generateContentInChatGpt}
        isLoading={isGeneratingContentInChatGpt}
        error={fetchingError}
        onChange={onContextChange}
        confirm={confirmGenerateContentInChatGpt}
        cancel={cancelGenerateContentInChatGpt}
        confirmButtonText="Generate Content"
        cancelButtonText="Cancel"
      />
    </>
  );
};
