import { ActionIcon } from '@mantine/core';
import { FC } from 'react';
import { cx } from '../../../styled-system/css';
import { button, type ButtonVariant } from '../../../styled-system/recipes';
import { token } from '../../../styled-system/tokens';
import { IconType } from '../../icons';
import { CoreProps } from '../../types';

export interface IIconButtonProps
  extends CoreProps,
    Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>,
    Partial<ButtonVariant> {
  Icon: IconType;
  loading?: boolean;
}

/**
 * A button with only an Icon.
 *
 * TODO: there are not specifications for these in the Design System, so this just follows the Button recipe.
 */
export const IconButton: FC<IIconButtonProps> = ({
  Icon,
  onClick,
  className,
  loading,
  variant = 'transparent',
  ...buttonProps
}) => {
  return (
    <ActionIcon
      onClick={onClick}
      className={cx(button({ variant }).root, className)}
      variant={variant}
      loading={loading}
      {...buttonProps}
    >
      <Icon title="action-icon" color={variant === 'filled' ? token('colors.button.icon.filled') : undefined} />
    </ActionIcon>
  );
};
