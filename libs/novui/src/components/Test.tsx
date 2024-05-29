import { FC, MouseEventHandler } from 'react';
import { Button as ExternalButton } from '@mantine/core';
import { css } from '../../styled-system/css';

interface ITestProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const Test: FC<ITestProps> = ({ onClick }) => {
  return (
    <ExternalButton
      onClick={onClick}
      leftSection={'hello'}
      classNames={{
        root: css({
          color: 'typography.text.feedback.alert',
          fontSize: '225 !important',
          bg: 'typography.text.feedback.success',
          p: '100',
        }),
        inner: css({
          color: 'typography.text.feedback.alert',
          fontSize: '225 !important',
          bg: 'typography.text.feedback.success',
        }),
      }}
    >
      Test
    </ExternalButton>
  );
};
