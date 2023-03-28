import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import type { IForm } from './formTypes';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import { useActiveIntegrations, useEnvController } from '../../../hooks';
import { useOutletContext, useParams } from 'react-router-dom';
import { SubPageWrapper } from './SubPageWrapper';
import { DigestMetadata } from '../workflow/DigestMetadata';
import { DelayMetadata } from '../workflow/DelayMetadata';
import { Button, colors } from '../../../design-system';
import styled from '@emotion/styled';
import { Bell, Chat, DigestGradient, Mail, Mobile, Sms, TimerGradient, Trash } from '../../../design-system/icons';
import { getChannel, NodeTypeEnum } from '../shared/channels';
import { Group } from '@mantine/core';

const getPageTitle = (channel: StepTypeEnum) => {
  if (channel === StepTypeEnum.EMAIL) {
    return (
      <Group align="center" spacing={16}>
        <Mail /> <span>Email</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <Group align="center" spacing={16}>
        <Bell /> <span>In-App</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.CHAT) {
    return (
      <Group align="center" spacing={16}>
        <Chat /> <span>Chat</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.PUSH) {
    return (
      <Group align="center" spacing={16}>
        <Mobile /> <span>Push</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.SMS) {
    return (
      <Group align="center" spacing={16}>
        <Sms /> <span>SMS</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.DELAY) {
    return (
      <Group align="center" spacing={16}>
        <TimerGradient /> <span>Delay</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.DIGEST) {
    return (
      <Group align="center" spacing={16}>
        <DigestGradient /> <span>Digest</span>
      </Group>
    );
  }

  return channel;
};

export const TemplateEditor = () => {
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum | undefined;
    stepUuid: string;
  }>();
  const { integrations } = useActiveIntegrations();
  const {
    control,
    formState: { errors },
    watch,
  } = useFormContext<IForm>();
  const steps = watch('steps');
  const { readonly } = useEnvController();

  const { onDelete }: any = useOutletContext();

  if (channel === undefined) {
    return null;
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <SubPageWrapper
        color={colors.white}
        title={getPageTitle(channel)}
        style={{ width: '100%', borderTopLeftRadius: 7, borderBottomLeftRadius: 7 }}
      >
        {steps.map((message, index) => {
          return message.template.type === StepTypeEnum.IN_APP && message.uuid === stepUuid ? (
            <TemplateInAppEditor key={message._id} errors={errors} control={control} index={index} />
          ) : null;
        })}
      </SubPageWrapper>
    );
  }

  if (channel === StepTypeEnum.EMAIL) {
    return (
      <SubPageWrapper
        color={colors.white}
        title={getPageTitle(channel)}
        style={{ width: '100%', borderTopLeftRadius: 7, borderBottomLeftRadius: 7 }}
      >
        {steps.map((message, index) => {
          return message.template.type === StepTypeEnum.EMAIL && message.uuid === stepUuid ? (
            <EmailMessagesCards
              key={message._id}
              index={index}
              isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.EMAIL)}
            />
          ) : null;
        })}
      </SubPageWrapper>
    );
  }

  return (
    <>
      <SubPageWrapper color={colors.white} title={getPageTitle(channel)}>
        {channel === StepTypeEnum.SMS &&
          steps.map((message, index) => {
            return message.template.type === StepTypeEnum.SMS && message.uuid === stepUuid ? (
              <TemplateSMSEditor
                key={message._id}
                control={control}
                index={index}
                errors={errors}
                isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.SMS)}
              />
            ) : null;
          })}
        {channel === StepTypeEnum.PUSH &&
          steps.map((message, index) => {
            return message.template.type === StepTypeEnum.PUSH && message.uuid === stepUuid ? (
              <TemplatePushEditor
                key={message._id}
                control={control}
                index={index}
                errors={errors}
                isIntegrationActive={
                  !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.PUSH)
                }
              />
            ) : null;
          })}
        {channel === StepTypeEnum.CHAT &&
          steps.map((message, index) => {
            return message.template.type === StepTypeEnum.CHAT && message.uuid === stepUuid ? (
              <TemplateChatEditor
                key={index}
                errors={errors}
                control={control}
                index={index}
                isIntegrationActive={
                  !!integrations?.some((integration) => integration.channel === ChannelTypeEnum.CHAT)
                }
              />
            ) : null;
          })}
        {channel === StepTypeEnum.DIGEST &&
          steps.map((message, index) => {
            return message.template.type === StepTypeEnum.DIGEST && message.uuid === stepUuid ? (
              <DigestMetadata control={control} index={index} />
            ) : null;
          })}
        {channel === StepTypeEnum.DELAY &&
          steps.map((message, index) => {
            return message.template.type === StepTypeEnum.DELAY && message.uuid === stepUuid ? (
              <DelayMetadata control={control} index={index} />
            ) : null;
          })}
        <DeleteStepButton
          mt={10}
          variant="outline"
          data-test-id="delete-step-button"
          onClick={() => {
            onDelete(stepUuid);
          }}
          disabled={readonly}
        >
          <Trash
            style={{
              marginRight: '5px',
            }}
          />
          Delete {getChannel(channel?.toString() ?? '')?.type === NodeTypeEnum.CHANNEL ? 'Step' : 'Action'}
        </DeleteStepButton>
      </SubPageWrapper>
    </>
  );
};

const DeleteStepButton = styled(Button)`
  //display: flex;
  //position: inherit;
  //bottom: 15px;
  //left: 20px;
  //right: 20px;
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
  :hover {
    background: rgba(229, 69, 69, 0.15);
  }
`;
