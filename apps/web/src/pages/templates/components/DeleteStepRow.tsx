import { StepTypeEnum } from '@novu/shared';
import { useEnvController } from '../../../hooks';
import { useOutletContext, useParams } from 'react-router-dom';
import { Button, colors } from '../../../design-system';
import styled from '@emotion/styled';
import { Trash } from '../../../design-system/icons';
import { Group } from '@mantine/core';
import { When } from '../../../components/utils/When';

export const DeleteStepRow = () => {
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
    <Group position="apart" mt={'auto'}>
      <When truthy={![StepTypeEnum.DELAY, StepTypeEnum.DIGEST].includes(channel)}>
        <div />
      </When>
      <When truthy={channel === StepTypeEnum.DIGEST}>
        <a
          target={'_blank'}
          style={{ color: 'rgb(221, 36, 118)', textDecoration: 'underline', fontSize: '18px' }}
          rel="noopener noreferrer"
          href={'https://docs.novu.co/workflows/digest'}
        >
          Learn more in the docs
        </a>
      </When>
      <When truthy={channel === StepTypeEnum.DELAY}>
        <a
          target={'_blank'}
          style={{ color: 'rgb(221, 36, 118)', textDecoration: 'underline', fontSize: '18px' }}
          rel="noopener noreferrer"
          href={'https://docs.novu.co/workflows/delay-action'}
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

const DeleteStepButton = styled(Button)`
  background: rgba(229, 69, 69, 0.15);
  color: ${colors.error};
  box-shadow: none;
`;
