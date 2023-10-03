import { Group } from '@mantine/core';
import { useFormContext } from 'react-hook-form';
import { useParams } from 'react-router-dom';

import { StepTypeEnum } from '@novu/shared';

import type { IForm } from '../../components/formTypes';
import { StepActiveSwitch } from '../StepActiveSwitch';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback, ReplyCallbackSwitch } from '../ReplyCallback';
import { When } from '../../../../components/utils/When';
import { UpdateButton } from '../../components/UpdateButton';

export function StepSettings({ index, path }: { index: number; path?: string }) {
  const { control } = useFormContext<IForm>();

  const { channel: channelType } = useParams<{
    channel: StepTypeEnum;
  }>();

  return (
    <>
      <Group position="apart" spacing={8}>
        <Group spacing={12}>
          <When truthy={channelType !== StepTypeEnum.DIGEST && channelType !== StepTypeEnum.DELAY}>
            <StepActiveSwitch path={path} index={index} control={control} />
            <ShouldStopOnFailSwitch index={index} control={control} />
            <When truthy={channelType === StepTypeEnum.EMAIL}>
              <ReplyCallbackSwitch index={index} control={control} />
            </When>
          </When>
        </Group>
        <UpdateButton />
      </Group>
      <ReplyCallback index={index} control={control} />
    </>
  );
}
