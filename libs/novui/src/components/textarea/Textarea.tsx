import { Textarea as ExternalTextarea, type TextareaProps as ExternalTextareaProps } from '@mantine/core';
import { ChangeEventHandler, forwardRef } from 'react';
import { CoreProps, LocalizedMessage, LocalizedString } from '../../types';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { input, InputVariant } from '../../../styled-system/recipes';
import { JsxStyleProps } from '../../../styled-system/types';
import { PolymorphicRef } from '../../types/props-helpers';
import { DEFAULT_TEXT_INPUT_TYPE, TextInputType } from '../input';

export interface TextareaProps
  extends JsxStyleProps,
    CoreProps,
    Pick<ExternalTextareaProps, 'leftSection'>,
    Partial<InputVariant> {
  label?: LocalizedMessage;
  description?: LocalizedMessage;
  placeholder?: LocalizedString;
  error?: LocalizedMessage;
  type?: TextInputType;

  required?: boolean;
  readOnly?: boolean;
  disabled?: boolean;

  value?: string;
  defaultValue?: string;
  onChange?: ChangeEventHandler<HTMLTextAreaElement>;
}

export const Textarea = forwardRef((props: TextareaProps, ref?: PolymorphicRef<'textarea'>) => {
  const [variantProps, inputProps] = input.splitVariantProps(props);
  const [cssProps, localProps] = splitCssProps(inputProps);
  const { onChange, className, ...otherProps } = localProps;
  const styles = input(variantProps);

  return (
    <ExternalTextarea
      ref={ref}
      onChange={(event) => onChange?.(event)}
      autoComplete="off"
      classNames={styles}
      className={cx(css(cssProps), className)}
      minRows={1}
      maxRows={4}
      autosize
      {...otherProps}
    />
  );
});
