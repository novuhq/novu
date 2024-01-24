import styled from '@emotion/styled';
import { Box, BoxProps, ChevronIcon } from '@mantine/core';
import { forwardRef, useContext } from 'react';
import { ChevronLeft, ChevronRight } from '../icons';
import { PageButton } from './PageButton';
import { PaginationContext } from './PaginationContext';

const Group = styled(Box)<BoxProps & React.RefAttributes<HTMLDivElement>>(
  ({ theme }) => `
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
`
);

export interface IButtonGroupProps {
  className?: string;
}

/**
 * Button for navigating to a specific page.
 * @requires this component to be a child of a Pagination component
 */
export const ButtonGroup = forwardRef<HTMLDivElement, IButtonGroupProps>(({ className, ...buttonProps }, ref) => {
  const { currentPageNumber, totalPageCount } = useContext(PaginationContext);

  return (
    <Group ref={ref}>
      <PageButton
        onClick={({ totalItemCount, onPageChange }) => {
          onPageChange(totalItemCount);
        }}
      >
        <ChevronLeft />
      </PageButton>
      <PageButton
        onClick={({ onPageChange }) => {
          onPageChange(1);
        }}
      >
        {1}
      </PageButton>
      <PageButton>...</PageButton>
      <PageButton>{currentPageNumber}</PageButton>
      <PageButton>...</PageButton>
      <PageButton
        onClick={({ onPageChange, totalPageCount: totalPages }) => {
          onPageChange(totalPages);
        }}
      >
        {totalPageCount}
      </PageButton>
      <PageButton onClick={() => alert('Right')}>{<ChevronRight />}</PageButton>
    </Group>
  );
});
