import { Group } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Chat, DigestGradient, InApp, Mail, Mobile, Sms, TimerGradient } from '@novu/design-system';

export const ChannelTitle = ({
  channel,
  spacing = 16,
  color = undefined,
}: {
  channel: StepTypeEnum | ChannelTypeEnum;
  spacing?: number;
  color?: any;
}) => {
  if (channel === StepTypeEnum.EMAIL || channel === ChannelTypeEnum.EMAIL) {
    return (
      <Group align="center" spacing={spacing}>
        <Mail color={color} /> <span>Email</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.IN_APP || channel === ChannelTypeEnum.IN_APP) {
    return (
      <Group align="center" spacing={spacing}>
        <InApp color={color} /> <span>In-App</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.CHAT || channel === ChannelTypeEnum.CHAT) {
    return (
      <Group align="center" spacing={spacing}>
        <Chat color={color} /> <span>Chat</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.PUSH || channel === ChannelTypeEnum.PUSH) {
    return (
      <Group align="center" spacing={spacing}>
        <Mobile color={color} /> <span>Push</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.SMS || channel === ChannelTypeEnum.SMS) {
    return (
      <Group align="center" spacing={spacing}>
        <Sms color={color} /> <span>SMS</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.DELAY) {
    return (
      <Group align="center" spacing={spacing}>
        <TimerGradient /> <span>Delay</span>
      </Group>
    );
  }

  if (channel === StepTypeEnum.DIGEST) {
    return (
      <Group align="center" spacing={spacing}>
        <DigestGradient /> <span>Digest</span>
      </Group>
    );
  }

  return <>{channel}</>;
};
