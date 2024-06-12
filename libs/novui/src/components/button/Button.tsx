import { Button as ExternalButton, ButtonProps, ButtonVariant } from '@mantine/core';
import { FC } from 'react';
import { cx, RecipeVariantProps } from '../../../styled-system/css';
import { button } from '../../../styled-system/recipes';
import { IconType } from '../../icons';
import { CorePropsWithChildren } from '../../types';

export interface IButtonProps
  extends RecipeVariantProps<typeof button>,
    CorePropsWithChildren,
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<ButtonProps, 'size'> {
  Icon?: IconType;
}

export const Button: FC<IButtonProps> = ({ children, Icon, size = 'md', className, variant, ...buttonProps }) => {
  return (
    <ExternalButton
      size={size}
      leftSection={Icon ? <Icon title="button-icon" size={variant === 'transparent' ? '32' : '16'} /> : undefined}
      classNames={button({ variant })}
      className={cx(className)}
      variant={['outline', 'filled'].includes(variant as ButtonVariant) ? (variant as ButtonVariant) : undefined}
      {...buttonProps}
    >
      {children}
    </ExternalButton>
  );
};
