import { Group } from '@mantine/core';
import { useParams } from 'react-router-dom';
import { StepTypeEnum } from '@novu/shared';

import { StepActiveSwitch } from '../StepActiveSwitch';
import { ShouldStopOnFailSwitch } from '../ShouldStopOnFailSwitch';
import { ReplyCallback, ReplyCallbackSwitch } from '../ReplyCallback';
import { When } from '../../../../components/utils/When';
import { UpdateButton } from '../../components/UpdateButton';
import { useEnvController } from '../../../../hooks';
import { useTemplateEditorForm } from '../../components/TemplateEditorFormProvider';

export function StepSettings() {
  const { channel: channelType } = useParams<{
    channel: StepTypeEnum;
  }>();
  const { template } = useTemplateEditorForm();
  const { chimera } = useEnvController({}, template?.chimera);

  return (
    <>
      <Group position="apart" spacing={8}>
        <Group spacing={12}>
          <When truthy={!chimera}>
            <When truthy={channelType !== StepTypeEnum.DIGEST && channelType !== StepTypeEnum.DELAY}>
              <StepActiveSwitch />
              <ShouldStopOnFailSwitch />
              <When truthy={channelType === StepTypeEnum.EMAIL}>
                <ReplyCallbackSwitch />
              </When>
            </When>
          </When>
        </Group>
        <UpdateButton />
      </Group>
      <When truthy={!chimera}>
        <ReplyCallback />
      </When>
    </>
  );
}
