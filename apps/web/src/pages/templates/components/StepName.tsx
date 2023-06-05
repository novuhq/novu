import { useState } from 'react';
import { Group } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { When } from '../../../components/utils/When';
import { GenerateContentButton } from './GenerateContentButton';
import { UpdateButton } from './UpdateButton';
import { StepNameInput } from './StepNameInput';
import { stepIcon, stepNames } from '../constants';
import { GenerateContentContextModal } from './GenerateContentContextModal';

export const StepName = ({
  channel,
  color = undefined,
  index,
}: {
  channel: StepTypeEnum | ChannelTypeEnum;
  index: number;
  color?: any;
}) => {
  const [context, setContext] = useState('');
  const [generateContentInChatGpt, setGenerateContentInChatGpt] = useState(false);
  const [isGeneratingContentInChatGpt, setIsGeneratingContentInChatGpt] = useState(false);
  const [isError, setIsError] = useState<string | undefined>(undefined);

  const onContextChange = (event) => {
    const { value } = event.target;
    setContext(value);
  };

  const confirmGenerateContentInChatGpt = async () => {
    setIsGeneratingContentInChatGpt(true);
    setIsError(undefined);
    try {
      // call to chat gpt
      console.log({ context });
      setIsGeneratingContentInChatGpt(false);
      setGenerateContentInChatGpt(false);
    } catch (e: any) {
      setIsGeneratingContentInChatGpt(false);
      setIsError(e?.message || 'Unknown error');
    }
  };

  const cancelGenerateContentInChatGpt = () => {
    setGenerateContentInChatGpt(false);
    setIsGeneratingContentInChatGpt(false);
  };

  const onGenerateContent = () => {
    setIsError(undefined);
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
        stepIndex={index}
        isOpen={generateContentInChatGpt}
        isLoading={isGeneratingContentInChatGpt}
        error={isError}
        onChange={onContextChange}
        confirm={confirmGenerateContentInChatGpt}
        cancel={cancelGenerateContentInChatGpt}
        confirmButtonText="Generate Content"
        cancelButtonText="Cancel"
      />
    </>
  );
};
