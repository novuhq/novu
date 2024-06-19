import { FC } from 'react';
import { CorePropsWithChildren } from '../types';
import { css } from '../../styled-system/css';
import { Text } from '../components';

export const formBorderClassName = css({ ml: '75', pl: '75', borderLeft: 'solid', borderColor: 'input.border' });

export const FormGroupTitle: FC<CorePropsWithChildren> = ({ children }) => {
  return (
    <Text py={'50'} fontWeight="strong">
      {children}
    </Text>
  );
};
