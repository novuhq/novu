import styled from '@emotion/styled';
import { PropsWithChildren } from 'react';
import { clamp } from '../utils';
import { colors } from '../config';
import { mantineConfig } from '../config/theme.config';
import { ControlBar } from './ControlBar';
import { ControlButton } from './ControlButton';
import { GoToPageInput } from './GoToPageInput';
import { PageSizeSelect } from './PageSizeSelect';
import { FIRST_PAGE_NUMBER } from './Pagination.const';
import { IPaginationContext, PaginationContext } from './PaginationContext';
import { clampPageNumber } from './util';

const PaginationWrapper = styled.div(
  ({ theme }) => `
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    & input {
      margin: 0;
      min-height: inherit;
      /** Explicitly set by designs */
      height: 32px;
      min-width: 44px;
    } 

    /* FIXME: what color to do for light mode? */
    /* FIXME: why can't I access theme values?! */
    color: ${theme.colorScheme !== 'light' ? colors.B60 : colors.B40};
    font-size: ${mantineConfig.fontSizes.md}px;
    line-height: 20px;
`
);
export interface IPaginationProps extends IPaginationContext {
  /** Ignore validations which clamp the current page number between 1 and totalPageCount */
  shouldSkipValidation?: boolean;
  className?: string;
}

/**
 * Primary Pagination component.
 *
 * Use the namespaced components (like Pagination.ControlBar) as children to compose your controls.
 *
 * <Pagination ...>
 *  <Pagination.ControlBar />
 * </Pagination>
 */
export const Pagination = ({
  currentPageNumber,
  totalPageCount,
  totalItemCount,
  onPageChange,
  pageSize,
  className,
  shouldSkipValidation,
  children,
}: PropsWithChildren<IPaginationProps>) => {
  const handlePageChangeWithValidation = (pageNum: number) => {
    const val = shouldSkipValidation ? pageNum : clampPageNumber(pageNum, { totalPageCount, currentPageNumber });
    onPageChange(val);
  };

  const totalPageCountToUse = shouldSkipValidation
    ? totalPageCount
    : clamp(totalPageCount, FIRST_PAGE_NUMBER, Number.MAX_SAFE_INTEGER);

  const curPageNumToUse = shouldSkipValidation
    ? currentPageNumber
    : clampPageNumber(currentPageNumber, {
        totalPageCount: totalPageCountToUse,
        currentPageNumber,
      });

  return (
    <PaginationContext.Provider
      value={{
        currentPageNumber: curPageNumToUse,
        totalItemCount,
        onPageChange: handlePageChangeWithValidation,
        totalPageCount: totalPageCountToUse,
        pageSize,
      }}
    >
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
