import { FC, MouseEventHandler } from 'react';
import { Button as ExternalButton } from '@mantine/core';
import { css } from '../../styled-system/css';
import { CoreProps } from '../types';

interface ITestProps extends CoreProps {
  onClick: MouseEventHandler<HTMLButtonElement>;
}

export const Test: FC<ITestProps> = ({ onClick, className }) => {
  return (
    <ExternalButton
      onClick={onClick}
      leftSection={'hello'}
      className={className}
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
