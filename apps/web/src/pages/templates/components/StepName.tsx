import { Group } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { Bell, Chat, DigestGradient, Mail, Mobile, Sms, TimerGradient } from '../../../design-system/icons';
import { When } from '../../../components/utils/When';
import { UpdateButton } from './UpdateButton';
import { StepNameInput } from './StepNameInput';

const stepNames: Record<StepTypeEnum | ChannelTypeEnum, string> = {
  email: 'Email',
  chat: 'Chat',
  in_app: 'In-App',
  sms: 'SMS',
  push: 'Push',
  digest: 'Digest',
  delay: 'Delay',
  trigger: 'Trigger',
};

const stepIcon: Record<StepTypeEnum | ChannelTypeEnum, (...args: any[]) => JSX.Element> = {
  email: Mail,
  chat: Chat,
  in_app: Bell,
  sms: Sms,
  push: Mobile,
  digest: DigestGradient,
  delay: TimerGradient,
  trigger: () => <></>,
};

export const StepName = ({
  channel,
  color = undefined,
  index,
}: {
  channel: StepTypeEnum | ChannelTypeEnum;
  index: number;
  color?: any;
}) => {
  const Icon = stepIcon[channel];

  return (
    <Group spacing={16}>
      <Icon color={color} /> <StepNameInput defaultValue={stepNames[channel]} index={index} />
      <When truthy={['in_app', 'email'].includes(channel)}>
        <div
          style={{
            marginRight: 32,
          }}
        >
          <UpdateButton />
        </div>
      </When>
    </Group>
  );
};
