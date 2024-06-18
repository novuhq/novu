import { Loader, Select as ExternalSelect } from '@mantine/core';
import { forwardRef } from 'react';
import { IconArrowDropDown } from 'src/icons';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { select } from '../../../styled-system/recipes';
import { token } from '../../../styled-system/tokens';
import { JsxStyleProps } from '../../../styled-system/types';
import { CoreProps } from '../../types';
import { PolymorphicRef } from '../../types/props-helpers';
import { SelectCoreProps } from './Select.types';

export interface ISelectProps extends JsxStyleProps, CoreProps, SelectCoreProps {}

export const Select = forwardRef((props: ISelectProps, ref?: PolymorphicRef<'input'>) => {
  const [variantProps, selectProps] = select.splitVariantProps(props);
  const [cssProps, localProps] = splitCssProps(selectProps);
  const { onChange, className, icon, loading, ...otherProps } = localProps;
  const selectClassNames = select(variantProps);

  const rightSection = loading ? (
    <Loader color={token('colors.icon.main')} size={24} />
  ) : (
    icon ?? <IconArrowDropDown title="select-dropdown-icon" size="32" />
  );

  return (
    <ExternalSelect
      ref={ref}
      onChange={(event) => onChange?.(event)}
      autoComplete="off"
      rightSection={rightSection}
      rightSectionWidth="auto"
      classNames={selectClassNames}
      className={cx(css(cssProps), className)}
      {...otherProps}
    />
  );
});
