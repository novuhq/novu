import styled from '@emotion/styled';
import { PropsWithChildren } from 'react';
import { mantineConfig } from '../config/theme.config';
import { colors } from '../config';
import { IPaginationContext, PaginationContext } from './PaginationContext';
import { ControlButton } from './ControlButton';
import { ControlBar } from './ControlBar';
import { GoToPageInput } from './GoToPageInput';
import { PageSizeSelect } from './PageSizeSelect';

const PaginationWrapper = styled.div(
  ({ theme }) => `
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    & input {
      margin: 0;
      min-height: inherit;
      height: 32px;
      min-width: 44px;
      font-weight: 700;
    } 

    /* FIXME: what color to do for light mode? */
    /* FIXME: why can't I access theme values?! */
    color: ${theme.colorScheme !== 'light' ? colors.B60 : colors.B15};
    font-size: ${mantineConfig.fontSizes.md}px;
    line-height: 20px;
`
);
export interface IPaginationProps extends IPaginationContext {
  className?: string;
}

export const Pagination = ({
  currentPageNumber,
  totalPageCount,
  totalItemCount,
  onPageChange,
  pageSize,
  className,
  children,
}: PropsWithChildren<IPaginationProps>) => {
  return (
    <PaginationContext.Provider value={{ currentPageNumber, totalItemCount, onPageChange, totalPageCount, pageSize }}>
      <PaginationWrapper className={className}>{children}</PaginationWrapper>
    </PaginationContext.Provider>
  );
};

Pagination.Context = PaginationContext;
Pagination.ControlButton = ControlButton;
Pagination.ControlBar = ControlBar;
Pagination.GoToPageInput = GoToPageInput;
Pagination.PageSizeSelect = PageSizeSelect;

export default Pagination;
