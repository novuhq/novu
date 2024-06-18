import React from 'react';
import { CoreProps, LocalizedMessage, LocalizedString } from '../../types';

export interface SelectItem<TItem extends string = string> {
  value: TItem;
  label: LocalizedString;
  selected?: boolean;
  disabled?: boolean;
}

export interface SelectCoreProps<TItem extends string = string> extends CoreProps {
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
  icon?: React.ReactNode;
}
