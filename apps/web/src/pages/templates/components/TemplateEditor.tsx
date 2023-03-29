import { useFormContext } from 'react-hook-form';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';

import { EmailMessagesCards } from './email-editor/EmailMessagesCards';
import { TemplateInAppEditor } from './in-app-editor/TemplateInAppEditor';
import { TemplateSMSEditor } from './TemplateSMSEditor';
import type { IForm } from './formTypes';
import { TemplatePushEditor } from './TemplatePushEditor';
import { TemplateChatEditor } from './chat-editor/TemplateChatEditor';
import { useActiveIntegrations, useEnvController } from '../../../hooks';
import { useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { SubPageWrapper } from './SubPageWrapper';
import { DigestMetadata } from '../workflow/DigestMetadata';
import { DelayMetadata } from '../workflow/DelayMetadata';
import { Button, colors } from '../../../design-system';
import styled from '@emotion/styled';
import { Bell, Chat, DigestGradient, Mail, Mobile, Sms, TimerGradient, Trash } from '../../../design-system/icons';
import { Group } from '@mantine/core';
import { When } from '../../../components/utils/When';
import { useEffect, useMemo } from 'react';
import { useBasePath } from '../hooks/useBasePath';

export const getPageTitle = (channel: StepTypeEnum) => {
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

const DeleteRow = () => {
  const { channel, stepUuid = '' } = useParams<{
    channel: StepTypeEnum;
    stepUuid: string;
  }>();
  const { readonly } = useEnvController();
  const { onDelete }: any = useOutletContext();

  if (!channel) {
    return null;
  }

  return (
    <Group
      position="apart"
      sx={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        right: 24,
      }}
    >
      <When truthy={![StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(channel)}>
        <div />
      </When>
      <When truthy={channel === StepTypeEnum.DIGEST}>
        <a
          target={'_blank'}
          style={{ color: 'rgb(221, 36, 118)', textDecoration: 'underline', fontSize: '18px' }}
          rel="noopener noreferrer"
          href={'https://docs.novu.co/platform/digest'}
        >
          Learn more in the docs
        </a>
      </When>
      <When truthy={channel === StepTypeEnum.DELAY}>
        <a
          target={'_blank'}
          style={{ color: 'rgb(221, 36, 118)', textDecoration: 'underline', fontSize: '18px' }}
          rel="noopener noreferrer"
          href={'https://docs.novu.co/platform/delay'}
        >
          Learn more in the docs
        </a>
      </When>
      <DeleteStepButton
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
        Delete Step
      </DeleteStepButton>
    </Group>
  );
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

  const index = useMemo(
    () => steps.findIndex((message) => message.template.type === channel && message.uuid === stepUuid),
    [channel, stepUuid, steps]
  );

  const navigate = useNavigate();
  const basePath = useBasePath();

  useEffect(() => {
    if (index > -1 || steps.length === 0) {
      return;
    }
    navigate(basePath);
  }, [index, steps]);

  if (index === -1 || channel === undefined) {
    return null;
  }

  if (channel === StepTypeEnum.IN_APP) {
    return (
      <SubPageWrapper
        color={colors.white}
        title={getPageTitle(channel)}
        style={{ width: '100%', borderTopLeftRadius: 7, borderBottomLeftRadius: 7, paddingBottom: 96 }}
      >
        <TemplateInAppEditor errors={errors} control={control} index={index} />
        <DeleteRow />
      </SubPageWrapper>
    );
  }

  if (channel === StepTypeEnum.EMAIL) {
    return (
      <SubPageWrapper
        color={colors.white}
        title={getPageTitle(channel)}
        style={{ width: '100%', borderTopLeftRadius: 7, borderBottomLeftRadius: 7, paddingBottom: 96 }}
      >
        <EmailMessagesCards
          index={index}
          isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.EMAIL)}
        />

        <DeleteRow />
      </SubPageWrapper>
    );
  }

  return (
    <>
      <SubPageWrapper color={colors.white} title={getPageTitle(channel)} style={{ paddingBottom: 96 }}>
        {channel === StepTypeEnum.SMS && (
          <TemplateSMSEditor
            control={control}
            index={index}
            errors={errors}
            isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.SMS)}
          />
        )}
        {channel === StepTypeEnum.PUSH && (
          <TemplatePushEditor
            control={control}
            index={index}
            errors={errors}
            isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.PUSH)}
          />
        )}
        {channel === StepTypeEnum.CHAT && (
          <TemplateChatEditor
            key={index}
            errors={errors}
            control={control}
            index={index}
            isIntegrationActive={!!integrations?.some((integration) => integration.channel === ChannelTypeEnum.CHAT)}
          />
        )}
        {channel === StepTypeEnum.DIGEST && <DigestMetadata control={control} index={index} />}
        {channel === StepTypeEnum.DELAY && <DelayMetadata control={control} index={index} />}
        <DeleteRow />
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
