import { Select as ExternalSelect } from '@mantine/core';
import { forwardRef } from 'react';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { input, select } from '../../../styled-system/recipes';
import { JsxStyleProps } from '../../../styled-system/types';
import { CoreProps } from '../../types';
import { PolymorphicRef } from '../../types/props-helpers';
import { SelectCoreProps } from './Select.types';

export interface ISelectProps extends JsxStyleProps, CoreProps, SelectCoreProps {}

export const Select = forwardRef((props: ISelectProps, ref?: PolymorphicRef<'input'>) => {
  const [variantProps, selectProps] = select.splitVariantProps(props);
  const [cssProps, localProps] = splitCssProps(selectProps);
  const { onChange, className, ...otherProps } = localProps;

  const inputClassNames = input(variantProps);
  const selectClassNames = select(variantProps);

  return (
    <ExternalSelect
      ref={ref}
      onChange={(event) => onChange?.(event)}
      autoComplete="off"
      classNames={{
        ...inputClassNames,
        ...selectClassNames,
      }}
      className={cx(css(cssProps), className)}
      {...otherProps}
    />
  );
});
