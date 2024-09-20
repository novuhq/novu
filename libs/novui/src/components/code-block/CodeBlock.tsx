import { CodeHighlightProps as ExternalCodeProps, CodeHighlight as ExternalCode } from '@mantine/code-highlight';
import React from 'react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { codeBlock, CodeBlockVariantProps } from '../../../styled-system/recipes';
import type { JsxStyleProps } from '../../../styled-system/types';
import { CoreProps } from '../../types';
import { PolymorphicComponentPropWithRef, PolymorphicRef } from '../../types/props-helpers';

// TODO: use @mantine/code-highlight/styles.layer.css instead
import '@mantine/code-highlight/styles.css';

export type CodeBlockCoreProps = Pick<ExternalCodeProps, 'language' | 'code' | 'withCopyButton'>;

type CodeBlockElement = 'div';

const DEFAULT_CODE_BLOCK_ELEMENT: CodeBlockElement = 'div';

export type CodeBlockProps<C extends React.ElementType> = PolymorphicComponentPropWithRef<
  C,
  JsxStyleProps & CodeBlockVariantProps & CoreProps & CodeBlockCoreProps
>;

type PolymorphicComponent = <C extends React.ElementType = CodeBlockElement>(
  props: CodeBlockProps<C>
) => JSX.Element | null;

/**
 * @deprecated This is not actually deprecated but needs more work to be styled properly and align with our use cases.
 *
 * Issues:
 * - switching between color modes and maintaining readable code
 * - no line numbers are built-in to Highlight JS
 *
 */
// @ts-expect-error
export const CodeBlock: PolymorphicComponent = React.forwardRef(
  <C extends React.ElementType = CodeBlockElement>(props: CodeBlockProps<C>, ref?: PolymorphicRef<C>) => {
    const [variantProps, codeBlockProps] = codeBlock.splitVariantProps(props);
    const [cssProps, localProps] = splitCssProps(codeBlockProps);
    const { className, as, code, ...otherProps } = localProps;
    const classNames = codeBlock(variantProps);
    const Component = props.as || DEFAULT_CODE_BLOCK_ELEMENT;

    return (
      <ExternalCode
        ref={ref}
        component={Component}
        classNames={classNames}
        className={cx(css(cssProps), className)}
        code={code}
        {...otherProps}
      />
    );
  }
);
