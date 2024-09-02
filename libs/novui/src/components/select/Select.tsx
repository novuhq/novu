import { Loader, Select as ExternalSelect } from '@mantine/core';
import { forwardRef, ReactNode } from 'react';
import { IconArrowDropDown } from '../../icons';
import { css, cx } from '../../../styled-system/css';
import { splitCssProps } from '../../../styled-system/jsx';
import { select } from '../../../styled-system/recipes';
import { token } from '../../../styled-system/tokens';
import { JsxStyleProps } from '../../../styled-system/types';
import { PolymorphicRef } from '../../types/props-helpers';
import { CoreProps, LocalizedMessage, LocalizedString } from '../../types';

export type SelectItem<TItem extends string = string> = {
  value: TItem;
  label: LocalizedString;
  selected?: boolean;
  disabled?: boolean;
};

export type SelectCoreProps<TItem extends string = string> = CoreProps & {
  data: SelectItem[];
  value?: TItem | null;
  defaultValue?: TItem | null;
  label?: LocalizedMessage;
  error?: LocalizedMessage;
  placeholder?: LocalizedString;
  description?: LocalizedMessage;

  onChange?: (value: TItem | null) => void;
  onDropdownOpen?: () => void;
  onDropdownClose?: () => void;

  disabled?: boolean;
  required?: boolean;
  readOnly?: boolean;
  loading?: boolean;
  allowDeselect?: boolean;
  withinPortal?: boolean;

  /** max number of options displayed -- defaults to Infinity */
  limit?: number;
  icon?: ReactNode;
};

export type SelectProps = JsxStyleProps & SelectCoreProps;

export const Select = forwardRef((props: SelectProps, ref?: PolymorphicRef<'input'>) => {
  const [variantProps, selectProps] = select.splitVariantProps(props);
  const [cssProps, localProps] = splitCssProps(selectProps);
  const { onChange, className, icon, loading, ...otherProps } = localProps;
  const selectClassNames = select(variantProps);

  const rightSection = loading ? (
    // TODO: replace with our own loader
    <Loader color={token('colors.icon.main')} size={'24'} />
  ) : (
    (icon ?? <IconArrowDropDown title="select-dropdown-icon" size="32" />)
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
