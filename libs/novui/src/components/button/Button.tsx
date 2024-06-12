import { Button as ExternalButton, ButtonProps, ButtonStylesNames } from '@mantine/core';
import { FC } from 'react';
import { colorPaletteGradient } from '../../ingredients/colorPaletteGradient.ingredient';
import { css, cx, sva } from '../../../styled-system/css';
import { IconType } from '../../icons';
import { CorePropsWithChildren } from '../../types';

type ButtonVariant = 'filled' | 'outline' | 'borderless';

export interface IButtonProps
  extends CorePropsWithChildren,
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<ButtonProps, 'size'> {
  Icon?: IconType;
  variant?: ButtonVariant;
}

const SLOTS: ButtonStylesNames[] = ['root', 'inner', 'label', 'loader', 'section'];

const buttonRecipe = sva({
  slots: SLOTS,
  base: {
    root: {
      colorPalette: 'mode.cloud',
      border: '[none !important]',
      _disabled: {
        opacity: '0.4',
      },
    },
    label: {
      color: 'typography.text.main',
      width: '[fit-content]',
      lineClamp: 1,
    },
    inner: {
      width: '[fit-content]',
    },
  },
  variants: {
    variant: {
      filled: {
        root: { ...colorPaletteGradient },
        label: {
          color: 'button.text.filled',
        },
      },
      outline: {
        root: {
          border: 'solid !important',
          borderColor: 'colorPalette.start !important',
          bg: 'button.secondary.background',

          boxShadow: 'medium',
          _disabled: {
            bg: '[transparent !important]',
          },
        },
        label: {
          color: 'typography.text.main !important',
        },
        section: {
          '& svg': {
            color: 'typography.text.main !important',
          },
        },
      },
      borderless: {
        root: {
          border: 'none',
          bg: '[transparent]',
        },
      },
    },
  },
});

export const Button: FC<IButtonProps> = ({
  children,
  Icon,
  size = 'md',
  variant = 'filled',
  className,
  ...buttonProps
}) => {
  return (
    <ExternalButton
      size={size}
      leftSection={Icon ? <Icon title="button-icon" size="16" className={css({ color: 'legacy.white' })} /> : undefined}
      variant={variant}
      classNames={buttonRecipe({ variant })}
      className={cx(className)}
      {...buttonProps}
    >
      {children}
    </ExternalButton>
  );
};
