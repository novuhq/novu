import styled from '@emotion/styled';
import { PropsWithChildren } from 'react';
import { mantineConfig } from '../config/theme.config';
import { colors } from '../config';
import { IPaginationContext, PaginationContext } from './PaginationContext';

const PaginationWrapper = styled.div(
  ({ theme }) => `
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    /* FIXME: what color to do for light mode? */
    /* FIXME: why can't I access theme values?! */
    color: ${theme.colorScheme !== 'light' ? colors.B60 : colors.B15};
    font-size: ${mantineConfig.fontSizes.md};
    line-height: 20px;
`
);
export interface IPaginationProps extends IPaginationContext {
  className?: string;
}

export const Pagination: React.FC<PropsWithChildren<IPaginationProps>> = ({
  currentPageNumber,
  totalPageCount,
  totalItemCount,
  onPageChange,
  pageSize,
  className,
  children,
}) => {
  return (
    <PaginationContext.Provider value={{ currentPageNumber, totalItemCount, onPageChange, totalPageCount, pageSize }}>
      <PaginationWrapper className={className}>{children}</PaginationWrapper>
    </PaginationContext.Provider>
  );
};
