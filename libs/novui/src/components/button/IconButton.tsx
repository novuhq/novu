import { ActionIcon, ButtonVariant as ExternalButtonVariant, ActionIconStylesNames } from '@mantine/core';
import React from 'react';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';
import { JsxStyleProps } from '../../../styled-system/types';
import { css, cx } from '../../../styled-system/css';
import { button, type ButtonVariant } from '../../../styled-system/recipes';
import { token } from '../../../styled-system/tokens';
import { IconType } from '../../icons';
import { CoreProps } from '../../types';
import { splitCssProps } from '../../../styled-system/jsx';
import { BUTTON_SIZE_TO_ICON_SIZE, DEFAULT_SIZE } from './Button.const';

interface IIconButtonProps {
  Icon: IconType;
  loading?: boolean;
}

type IconButtonDefaultElement = 'button';

export type IconButtonProps<C extends React.ElementType = IconButtonDefaultElement> = PolymorphicComponentPropWithRef<
  C,
  JsxStyleProps & Partial<ButtonVariant> & CoreProps & IIconButtonProps
>;

const DEFAULT_VARIANT: ButtonVariant['variant'] = 'transparent';

type PolymorphicComponent = <C extends React.ElementType = IconButtonDefaultElement>(
  props: IconButtonProps<C>
) => JSX.Element | null;

/**
 * A button with only an Icon.
 *
 * TODO: there are not specifications for these in the Design System, so this just follows the Button recipe.
 */
// @ts-expect-error
export const IconButton: PolymorphicComponent = React.forwardRef(
  <C extends React.ElementType = IconButtonDefaultElement>(
    { variant = DEFAULT_VARIANT, ...props }: IconButtonProps<C>,
    ref?: PolymorphicRef<C>
  ) => {
    const [variantProps, buttonProps] = button.splitVariantProps({ ...props, variant });
    const [cssProps, localProps] = splitCssProps(buttonProps);
    const { className, as, loading, Icon, ...otherProps } = localProps;
    const styles = button(variantProps);

    return (
      <ActionIcon
        ref={ref}
        component={as ?? 'button'}
        classNames={styles}
        className={cx(css(cssProps), className)}
        variant={variantProps.variant as ExternalButtonVariant}
        loading={loading}
        {...otherProps}
      >
        <Icon
          title={props.title || 'action-icon'}
          color={variant === 'filled' ? token('colors.button.icon.filled') : undefined}
          size={BUTTON_SIZE_TO_ICON_SIZE[(variantProps.size as ButtonVariant['size']) ?? DEFAULT_SIZE]}
        />
      </ActionIcon>
    );
  }
);
