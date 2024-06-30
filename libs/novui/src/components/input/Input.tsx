import { TextInput as ExternalTextInput, type InputProps as ExternalTextInputProps } from '@mantine/core';
import { ChangeEventHandler, forwardRef } from 'react';
import { CoreProps, LocalizedMessage, LocalizedString } from '../../types';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { input, InputVariant } from '../../../styled-system/recipes';
import { JsxStyleProps } from '../../../styled-system/types';
import { PolymorphicRef } from '../../types/props-helpers';
import { IconErrorOutline } from '../../icons';

export type TextInputType = 'text' | 'password' | 'email' | 'search' | 'tel';
export const DEFAULT_TEXT_INPUT_TYPE: TextInputType = 'text';

export interface IInputProps
  extends JsxStyleProps,
    CoreProps,
    Pick<ExternalTextInputProps, 'rightSection'>,
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
  onChange?: ChangeEventHandler<HTMLInputElement>;
}

export const Input = forwardRef(
  ({ type = DEFAULT_TEXT_INPUT_TYPE, ...props }: IInputProps, ref?: PolymorphicRef<'input'>) => {
    const [variantProps, inputProps] = input.splitVariantProps({ ...props, type });
    const [cssProps, localProps] = splitCssProps(inputProps);
    const { onChange, className, rightSection, ...otherProps } = localProps;
    const classNames = input(variantProps);

    return (
      <ExternalTextInput
        ref={ref}
        onChange={(event) => onChange?.(event)}
        autoComplete="off"
        classNames={classNames}
        className={cx(css(cssProps), className)}
        rightSection={otherProps.error ? <IconErrorOutline title="input error indicator" /> : rightSection}
        variant={undefined}
        {...otherProps}
      />
    );
  }
);
