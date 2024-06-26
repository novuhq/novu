import { Loader as ExternalLoader, LoaderProps as ExternalLoaderProps } from '@mantine/core';
import React from 'react';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';
import { JsxStyleProps } from '../../../styled-system/types';
import { css, cx } from '../../../styled-system/css';
import { button, type ButtonVariant } from '../../../styled-system/recipes';
import { token } from '../../../styled-system/tokens';
import { IconType } from '../../icons';
import { CoreProps } from '../../types';
import { splitCssProps } from '../../../styled-system/jsx';

interface ILoaderProps {
  Icon: IconType;
  loading?: boolean;
}

type LoaderDefaultElement = 'div';
const DEFAULT_ELEMENT: LoaderDefaultElement = 'div';

export type LoaderProps<C extends React.ElementType = LoaderDefaultElement> = PolymorphicComponentPropWithRef<
  C,
  JsxStyleProps & Partial<ButtonVariant> & CoreProps & ILoaderProps
>;

const DEFAULT_VARIANT: ButtonVariant['variant'] = 'transparent';

type PolymorphicComponent = <C extends React.ElementType = LoaderDefaultElement>(
  props: LoaderProps<C>
) => JSX.Element | null;

/**
 * A button with only an Icon.
 *
 * TODO: there are not specifications for these in the Design System, so this just follows the Button recipe.
 */
export const Loader: PolymorphicComponent = React.forwardRef(
  <C extends React.ElementType = LoaderDefaultElement>(
    { variant = DEFAULT_VARIANT, ...props }: LoaderProps<C>,
    ref?: PolymorphicRef<C>
  ) => {
    const [variantProps, buttonProps] = button.splitVariantProps({ ...props, variant });
    const [cssProps, localProps] = splitCssProps(buttonProps);
    const { className, as, loading, Icon, ...otherProps } = localProps;
    const styles = button(variantProps);

    return (
      <ExternalLoader
        ref={ref}
        component={as ?? DEFAULT_ELEMENT}
        classNames={styles}
        className={cx(css(cssProps), className)}
        variant={variantProps.variant as ExternalButtonVariant}
        loading={loading}
        {...otherProps}
      >
        <Icon title="action-icon" color={variant === 'filled' ? token('colors.button.icon.filled') : undefined} />
      </ExternalLoader>
    );
  }
);
