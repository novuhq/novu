import React, { FC } from 'react';
import { SelectProps, InputBaseProps, SelectItem } from '@mantine/core';

import { SpacingProps } from '../shared/spacing.props';

export interface ISelectProps extends SpacingProps {
  data: (string | { value: string; label?: string } | SelectItem)[];
  value?: string[] | string | null;
  onChange?: (value: string[] | string | null) => void;
  label?: React.ReactNode;
  error?: React.ReactNode;
  itemComponent?: FC<any>;
  valueComponent?: FC<any>;
  placeholder?: string;
  description?: string;
  getCreateLabel?: (query: string) => React.ReactNode;
  onDropdownOpen?: () => void;
  onDropdownClose?: () => void;
  onSearchChange?: (query: string) => void;
  onCreate?: SelectProps['onCreate'];
  searchable?: boolean;
  creatable?: boolean;
  disabled?: boolean;
  required?: boolean;
  loading?: boolean;
  type?: 'multiselect' | 'select';
  filter?: (value: string, item: SelectItem) => boolean;
  allowDeselect?: boolean;
  dataTestId?: string;
  rightSectionWidth?: React.CSSProperties['width'];
  inputProps?: InputBaseProps;
  withinPortal?: boolean;
  limit?: SelectProps['limit'];
  dropdownPosition?: SelectProps['dropdownPosition'];
  icon?: React.ReactNode;
  variant?: SelectProps['variant'];
  className?: string;
}
