import { Checkbox as ExternalCheckbox } from '@mantine/core';
import { ChangeEventHandler, forwardRef } from 'react';
import { PolymorphicRef } from '../../types/props-helpers';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { checkbox } from '../../../styled-system/recipes';
import { JsxStyleProps } from '../../../styled-system/types';
import { CoreProps, LocalizedMessage, LocalizedString } from '../../types';

export type CheckboxProps = JsxStyleProps &
  CoreProps & {
    label?: LocalizedMessage;
    description?: LocalizedMessage;
    placeholder?: LocalizedString;
    error?: LocalizedMessage;

    required?: boolean;
    readOnly?: boolean;
    disabled?: boolean;

    checked?: boolean;
    defaultChecked?: boolean;
    onChange?: ChangeEventHandler<HTMLInputElement>;
  };

export const Checkbox = forwardRef(({ ...props }: CheckboxProps, ref?: PolymorphicRef<'input'>) => {
  const [variantProps, inputProps] = checkbox.splitVariantProps({ ...props });
  const [cssProps, localProps] = splitCssProps(inputProps);
  const { onChange, className, ...otherProps } = localProps;
  const classNames = checkbox(variantProps);

  return (
    <ExternalCheckbox
      ref={ref}
      classNames={classNames}
      className={cx(css(cssProps), className)}
      onChange={onChange}
      size="md"
      {...otherProps}
    />
  );
});
