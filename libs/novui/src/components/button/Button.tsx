import { FC } from 'react';
import { CorePropsWithChildren } from '../../types';
import { Button as ExternalButton, ButtonProps } from '@mantine/core';
import { IconType } from '../../icons';
import { css } from '../../../styled-system/css';

export interface IButtonProps
  extends CorePropsWithChildren,
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<ButtonProps, 'size' | 'variant'> {
  Icon?: IconType;
}

export const Button: FC<IButtonProps> = ({ children, Icon, size = 'md', variant = 'filled', ...buttonProps }) => {
  return (
    <ExternalButton
      size={size}
      leftSection={Icon ? <Icon title="button-icon" size="16" className={css({ color: 'legacy.white' })} /> : undefined}
      variant={variant}
      {...buttonProps}
    >
      {children}
    </ExternalButton>
  );
};
