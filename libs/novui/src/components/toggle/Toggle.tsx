import { PolymorphicRef } from '../../types/props-helpers';
import { ChangeEvent, forwardRef, ReactNode } from 'react';
import { Switch } from '@mantine/core';
import { css, cx } from '../../../styled-system/css';
import { toggle } from '../../../styled-system/recipes';
import { splitCssProps } from '../../../styled-system/jsx';

interface IToggleProps {
  label?: ReactNode;
  checked?: boolean;
  onChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
}

export const Toggle = forwardRef((props: IToggleProps, ref?: PolymorphicRef<'input'>) => {
  const [variantProps, toggleProps] = toggle.splitVariantProps(props);
  const [cssProps, localProps] = splitCssProps(toggleProps);
  const { onChange, className, checked, disabled, label } = localProps;
  const classNames = toggle(variantProps);

  return (
    <Switch
      ref={ref}
      onChange={(event) => onChange?.(event)}
      checked={checked}
      classNames={classNames}
      className={cx(css(cssProps), className)}
      disabled={disabled}
      size="lg"
      label={label}
    />
  );
});
