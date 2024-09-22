import React, { type ElementType } from 'react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { title, type TitleVariantProps } from '../../../styled-system/recipes';
import type { JsxStyleProps } from '../../../styled-system/types';
import { CoreProps, ExtractGeneric } from '../../types';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';

export type TitleProps<C extends React.ElementType> = PolymorphicComponentPropWithRef<
  C,
  JsxStyleProps & TitleVariantProps & CoreProps
>;

export type TitleVariant = ExtractGeneric<TitleVariantProps['variant']>;

const VARIANT_ELEMENT_LOOKUP: Record<TitleVariant, Extract<ElementType, 'h1' | 'h2' | 'h3'>> = {
  page: 'h1',
  section: 'h2',
  subsection: 'h3',
};

const DEFAULT_VARIANT: TitleVariant = 'page';

type PolymorphicComponent = <C extends React.ElementType = 'h1'>(props: TitleProps<C>) => JSX.Element | null;

// @ts-expect-error
export const Title: PolymorphicComponent = React.forwardRef(
  <C extends React.ElementType = 'h1'>(props: TitleProps<C>, ref?: PolymorphicRef<C>) => {
    const [variantProps, titleProps] = title.splitVariantProps(props);
    const [cssProps, localProps] = splitCssProps(titleProps);
    const { className, as, ...otherProps } = localProps;
    const styles = title(variantProps);
    const Component = props.as || VARIANT_ELEMENT_LOOKUP[(variantProps.variant as TitleVariant) ?? DEFAULT_VARIANT];

    return <Component ref={ref} className={cx(styles, css(cssProps), className)} {...otherProps} />;
  }
);
