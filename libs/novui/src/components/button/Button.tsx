import {
  Button as ExternalButton,
  ButtonProps as ExternalButtonProps,
  ButtonVariant as ExternalButtonVariant,
} from '@mantine/core';
import React from 'react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { button, type ButtonVariant } from '../../../styled-system/recipes';
import { JsxStyleProps } from '../../../styled-system/types';
import { IconSize, IconType } from '../../icons';
import { CoreProps, CorePropsWithChildren } from '../../types';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';

export interface ButtonCoreProps
  extends CorePropsWithChildren,
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    Pick<ExternalButtonProps, 'loading'> {
  Icon?: IconType;
  loading?: boolean;
}

type ButtonDefaultElement = 'button';

export type ButtonProps<C extends React.ElementType = ButtonDefaultElement> = PolymorphicComponentPropWithRef<
  C,
  JsxStyleProps & Partial<ButtonVariant> & CoreProps & ButtonCoreProps
>;

const DEFAULT_VARIANT: ButtonVariant['variant'] = 'filled';
const DEFAULT_SIZE: ButtonVariant['size'] = 'md';

type PolymorphicComponent = <C extends React.ElementType = ButtonDefaultElement>(
  props: ButtonProps<C>
) => JSX.Element | null;

const BUTTON_SIZE_TO_ICON_SIZE: Record<ButtonVariant['size'], IconSize> = {
  xs: '16',
  sm: '20',
  md: '20',
  lg: '20',
};

// Note: for right now, these are equivalent, but we haven't agreed on our size tokens (caps, one letter, etc)
const BUTTON_SIZE_TO_EXTERNAL_BUTTON_SIZE: Record<ButtonVariant['size'], ExternalButtonProps['size']> = {
  xs: 'xs',
  sm: 'sm',
  md: 'md',
  lg: 'lg',
};

// Note: for right now, these are identical, but we may adjust them later
const BUTTON_VARIANT_TO_EXTERNAL_BUTTON_VARIANT: Record<ButtonVariant['variant'], ExternalButtonVariant> = {
  filled: 'filled',
  outline: 'outline',
  transparent: 'transparent',
};

export const Button: PolymorphicComponent = React.forwardRef(
  <C extends React.ElementType = ButtonDefaultElement>(
    { variant = DEFAULT_VARIANT, size = DEFAULT_SIZE, ...props }: ButtonProps<C>,
    ref?: PolymorphicRef<C>
  ) => {
    const [variantProps, buttonProps] = button.splitVariantProps({ ...props, variant, size });
    const [cssProps, localProps] = splitCssProps(buttonProps);
    const { className, as, Icon, children, ...otherProps } = localProps;
    const styles = button(variantProps);

    return (
      <ExternalButton
        ref={ref}
        component={as ?? 'button'}
        size={BUTTON_SIZE_TO_EXTERNAL_BUTTON_SIZE[size]}
        variant={BUTTON_VARIANT_TO_EXTERNAL_BUTTON_VARIANT[variant]}
        leftSection={
          Icon ? (
            <Icon title="button-icon" size={variant === 'transparent' ? '20' : BUTTON_SIZE_TO_ICON_SIZE[size]} />
          ) : undefined
        }
        classNames={styles}
        className={cx(css(cssProps), className)}
        fullWidth={Boolean(variantProps.fullWidth)}
        {...otherProps}
      >
        {children}
      </ExternalButton>
    );
  }
);
