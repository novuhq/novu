import { Styles, DrawerStylesNames } from '@mantine/core';
import { ReactNode } from 'react';

export interface ISidebarBaseProps {
  customHeader?: ReactNode;
  customFooter?: ReactNode;
  children: ReactNode;
  isOpened: boolean;
  isExpanded?: boolean;
  isLoading?: boolean;
  isParentScrollable?: boolean;
  styles?: Styles<DrawerStylesNames, Record<string, any>>;
  onClose: () => void;
  onBack?: () => void;
  onSubmit?: React.FormEventHandler<HTMLFormElement>;
  'data-test-id'?: string;
}
