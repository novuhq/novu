import styled from '@emotion/styled';
import { Box, BoxProps } from '@mantine/core';
import { forwardRef, useContext } from 'react';
import { ChevronLeft, ChevronRight } from '../icons';
import { PageButton } from './PageButton';
import { DEFAULT_SIBLING_COUNT } from './Pagination.const';
import { PaginationContext } from './PaginationContext';
import { getPaginationSymbols, PaginationSymbol } from './util';

const Group = styled(Box)<BoxProps & React.RefAttributes<HTMLDivElement>>(
  ({ theme }) => `
  display: flex;
  flex-direction: row;
  align-items: center;
  /* TODO: use theme value */
  gap: 0.25rem;
`
);

export interface IButtonGroupProps {
  /** the quantity of items to show on each side of the "current page" */
  siblingCount?: number;
  className?: string;
}

/**
 * Button for navigating to a specific page.
 * @requires this component to be a child of a Pagination component
 */
export const ButtonGroup = forwardRef<HTMLDivElement, IButtonGroupProps>(
  ({ className, siblingCount = DEFAULT_SIBLING_COUNT }, ref) => {
    const { currentPageNumber, totalPageCount } = useContext(PaginationContext);

    const renderCentralButton = (curPageSymbol: PaginationSymbol, index: number) => {
      if (curPageSymbol === 'ELLIPSIS') {
        return (
          <PageButton key={`pagination-ellipsis-btn-${index}`} disabled>
            ...
          </PageButton>
        );
      }

      return (
        <PageButton
          key={`pagination-page-number-btn-${curPageSymbol}-${index}`}
          onClick={({ onPageChange }) => {
            onPageChange(curPageSymbol);
          }}
        >
          {curPageSymbol}
        </PageButton>
      );
    };

    return (
      <Group ref={ref}>
        <PageButton
          onClick={({ onPageChange, currentPageNumber: curPageNum }) => {
            onPageChange(curPageNum - 1);
          }}
          disabled={currentPageNumber === 1}
        >
          <ChevronLeft />
        </PageButton>
        {getPaginationSymbols({ totalPageCount, currentPageNumber, siblingCount }).map(renderCentralButton)}
        <PageButton
          onClick={({ onPageChange, currentPageNumber: curPageNum }) => {
            onPageChange(curPageNum + 1);
          }}
          disabled={currentPageNumber === totalPageCount}
        >
          {<ChevronRight />}
        </PageButton>
      </Group>
    );
  }
);
