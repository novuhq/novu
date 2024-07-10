import { FC } from 'react';
import { CorePropsWithChildren } from '../types';
import { css } from '../../styled-system/css';
import { Text } from '../components';

export const formItemClassName = css({
  ml: '75',
  pl: '75',
  borderLeft: 'solid',
  borderColor: 'input.border',
  py: '50',
  '&:first-of-type': { paddingTop: '0' },
  '&:last-of-type': { paddingBottom: '0' },
});

export const FormGroupTitle: FC<CorePropsWithChildren> = ({ children }) => {
  return (
    <Text py={'50'} fontWeight="strong">
      {children}
    </Text>
  );
};
