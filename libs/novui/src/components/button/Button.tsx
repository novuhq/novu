import { Button as ExternalButton, ButtonProps as ExternalButtonProps } from '@mantine/core';
import React from 'react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { button, type ButtonVariant } from '../../../styled-system/recipes';
import { JsxStyleProps } from '../../../styled-system/types';
import { IconType } from '../../icons';
import { CoreProps, CorePropsWithChildren } from '../../types';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';
import {
  BUTTON_SIZE_TO_EXTERNAL_BUTTON_SIZE,
  BUTTON_SIZE_TO_ICON_SIZE,
  BUTTON_VARIANT_TO_EXTERNAL_BUTTON_VARIANT,
  DEFAULT_SIZE,
  DEFAULT_VARIANT,
} from './Button.const';

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

type PolymorphicComponent = <C extends React.ElementType = ButtonDefaultElement>(
  props: ButtonProps<C>
) => JSX.Element | null;

// @ts-expect-error
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
