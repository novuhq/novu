import { FC } from 'react';
import { CorePropsWithChildren } from '../types';
import { css, cva } from '../../styled-system/css';
import { Text } from '../components';

export const formItemClassName = css({
  ml: '75',
  pl: '75',
  py: '50',
  '&:first-of-type': { paddingTop: '0' },
  '&:last-of-type': { paddingBottom: '0' },
});

export const formItemRecipe = cva({
  base: {
    ml: '75',
    pl: '75',
    py: '50',
    '&:first-of-type': { paddingTop: '0' },
    '&:last-of-type': { paddingBottom: '0' },
  },
  variants: {
    depth: {
      even: {
        backgroundColor: 'surface.popover',
      },
      odd: {
        backgroundColor: 'surface.panel',
      },
    },
  },
});

export const FormGroupTitle: FC<CorePropsWithChildren> = ({ children }) => {
  return (
    <Text py={'50'} fontWeight="strong">
      {children}
    </Text>
  );
};
