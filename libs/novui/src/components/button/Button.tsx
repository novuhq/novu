import { Button as ExternalButton, ButtonProps, ButtonVariant as ExternalButtonVariant } from '@mantine/core';
import { FC } from 'react';
import { cx } from '../../../styled-system/css';
import { button, type ButtonVariant } from '../../../styled-system/recipes';
import { IconType } from '../../icons';
import { CorePropsWithChildren } from '../../types';

export interface IButtonProps
  extends Partial<ButtonVariant>,
    CorePropsWithChildren,
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<ButtonProps, 'size'> {
  Icon?: IconType;
}

export const Button: FC<IButtonProps> = ({
  children,
  Icon,
  size = 'md',
  className,
  variant = 'filled',
  ...buttonProps
}) => {
  return (
    <ExternalButton
      size={size}
      leftSection={Icon ? <Icon title="button-icon" size={variant === 'transparent' ? '32' : '16'} /> : undefined}
      classNames={button({ variant })}
      className={cx(className)}
      variant={
        ['outline', 'filled'].includes(variant as ExternalButtonVariant)
          ? (variant as ExternalButtonVariant)
          : undefined
      }
      {...buttonProps}
    >
      {children}
    </ExternalButton>
  );
};
