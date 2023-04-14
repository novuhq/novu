import { Group } from '@mantine/core';
import { ChannelTypeEnum, StepTypeEnum } from '@novu/shared';
import { When } from '../../../components/utils/When';
import { UpdateButton } from './UpdateButton';
import { StepNameInput } from './StepNameInput';
import { stepIcon, stepNames } from '../constants';

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
