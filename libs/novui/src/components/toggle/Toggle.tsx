import { PolymorphicRef } from '../../types/props-helpers';
import { ChangeEvent, forwardRef } from 'react';
import { Switch } from '@mantine/core';
import { css, cx } from '../../../styled-system/css';
import { toggle } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';
import { CoreProps, LocalizedMessage } from '../../types';

export type ToggleProps = CoreProps & {
  label?: LocalizedMessage;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
};

export const Toggle = forwardRef((props: ToggleProps, ref?: PolymorphicRef<'input'>) => {
  const [variantProps, toggleProps] = toggle.splitVariantProps(props);
  const [cssProps, localProps] = splitCssProps(toggleProps);
  const { onChange, className, checked, disabled, label } = localProps;
  const classNames = toggle(variantProps);

  return (
    <Switch
      ref={ref}
      onChange={onChange}
      checked={checked}
      classNames={classNames}
      className={cx(css(cssProps), className)}
      disabled={disabled}
      size="lg"
      label={label}
    />
  );
});
