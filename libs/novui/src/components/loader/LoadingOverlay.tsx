import { LoaderProps as ExternalLoaderProps, LoadingOverlay as ExternalLoadingOverlay } from '@mantine/core';
import React from 'react';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';
import { JsxStyleProps } from '../../../styled-system/types';
import { css, cx } from '../../../styled-system/css';
import { loadingOverlay, type LoadingOverlayVariant } from '../../../styled-system/recipes';
import { CoreProps } from '../../types';
import { splitCssProps } from '../../../styled-system/jsx';
import { IconSize } from '../../icons';
import { ZIndexToken, token } from '../../../styled-system/tokens';

export type LoaderSize = IconSize | '64';

const DEFAULT_SIZE: LoaderSize = '64';
const DEFAULT_Z_INDEX: ZIndexToken = 'overlay';

type LoadingOverlayCoreProps = {
  isVisible?: boolean;
  size?: LoaderSize;
  zIndex?: ZIndexToken;
} & Pick<ExternalLoaderProps, 'type'>;

type LoadingOverlayDefaultElement = 'div';
const DEFAULT_ELEMENT: LoadingOverlayDefaultElement = 'div';

export type LoadingOverlayProps<C extends React.ElementType = LoadingOverlayDefaultElement> =
  PolymorphicComponentPropWithRef<
    C,
    JsxStyleProps & Partial<LoadingOverlayVariant> & CoreProps & LoadingOverlayCoreProps
  >;

type PolymorphicComponent = <C extends React.ElementType = LoadingOverlayDefaultElement>(
  props: LoadingOverlayProps<C>
) => JSX.Element | null;

/**
 * Loader with overlay.
 *
 * TODO: Add support for container-scoped loader. For now, only full-page works.
 * To work around this, use position: relative in the parent component
 */
// @ts-expect-error
export const LoadingOverlay: PolymorphicComponent = React.forwardRef(
  <C extends React.ElementType = LoadingOverlayDefaultElement>(
    { variant, isVisible = true, size = DEFAULT_SIZE, zIndex = DEFAULT_Z_INDEX, ...props }: LoadingOverlayProps<C>,
    ref?: PolymorphicRef<C>
  ) => {
    const [variantProps, loadingOverlayProps] = loadingOverlay.splitVariantProps({
      ...props,
      variant,
      isVisible,
      size,
      zIndex,
    });
    const [cssProps, localProps] = splitCssProps(loadingOverlayProps);
    const { className, as, type, ...otherProps } = localProps;
    const classNames = loadingOverlay(variantProps);

    if (!isVisible) {
      return null;
    }

    return (
      <ExternalLoadingOverlay
        ref={ref}
        component={as ?? DEFAULT_ELEMENT}
        classNames={classNames}
        className={cx(css(cssProps), className)}
        loading
        visible={isVisible}
        loaderProps={{ type, size }}
        // @ts-expect-error
        zIndex={token(`zIndex.${zIndex}`)}
        {...otherProps}
      />
    );
  }
);
