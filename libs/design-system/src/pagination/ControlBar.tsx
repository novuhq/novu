import styled from '@emotion/styled';
import { Box, BoxProps, useMantineTheme } from '@mantine/core';
import { forwardRef, PropsWithChildren, useContext, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from '../icons';
import { ControlButton } from './ControlButton';
import { DEFAULT_ELLIPSIS_NODE, DEFAULT_SIBLING_COUNT, MAX_SIBLING_COUNT, MIN_SIBLING_COUNT } from './Pagination.const';
import { PaginationContext } from './PaginationContext';
import { getPaginationSymbols, PaginationSymbol } from './util';
import { clamp } from '../utils';
import { IconControlButton } from './IconControlButton';

const Group = styled(Box)<BoxProps & React.RefAttributes<HTMLDivElement>>(
  ({ theme }) => `
  display: flex;
  flex-direction: row;
  align-items: center;
  /* TODO: use theme value */
  gap: 0.25rem;
`
);

export interface IControlBarProps {
  /** the quantity of items to show on each side of the "current page" */
  siblingCount?: number;
  /** the node to render when showing a gap between two disparate page numbers. Defaults to "..." */
  ellipsisNode?: JSX.Element;
  className?: string;
}

/**
 * Primary pagination navigation component.
 *
 * `children` is optional, and if included, will override the default behavior.
 * If using your own children, use `Pagination.ControlButton` to hook into the PaginationContext.
 * @requires this component to be a child of a Pagination component
 */
export const ControlBar = forwardRef<HTMLDivElement, PropsWithChildren<IControlBarProps>>(
  ({ className, siblingCount = DEFAULT_SIBLING_COUNT, ellipsisNode = DEFAULT_ELLIPSIS_NODE, children }, ref) => {
    const { currentPageNumber, totalPageCount } = useContext(PaginationContext);
    const [clampedSiblingCount, setClampedSiblingCount] = useState<number>(siblingCount);

    useEffect(() => {
      // ensure the sibling count is within the allowed range
      if (siblingCount < MIN_SIBLING_COUNT || siblingCount > MAX_SIBLING_COUNT) {
        setClampedSiblingCount(clamp(siblingCount, MIN_SIBLING_COUNT, MAX_SIBLING_COUNT));
      }
    }, [siblingCount, setClampedSiblingCount]);

    const renderCentralButton = (curPageSymbol: PaginationSymbol, index: number) => {
      if (curPageSymbol === 'ELLIPSIS') {
        return (
          <ControlButton key={`pagination-ellipsis-btn-${index}`} disabled>
            {ellipsisNode}
          </ControlButton>
        );
      }

      return (
        <ControlButton
          key={`pagination-page-number-btn-${curPageSymbol}-${index}`}
          onClick={({ onPageChange }) => {
            onPageChange(curPageSymbol);
          }}
          isCurrentPage={curPageSymbol === currentPageNumber}
        >
          {curPageSymbol}
        </ControlButton>
      );
    };

    return (
      <Group ref={ref} className={className} theme={useMantineTheme()}>
        {children || (
          <>
            <IconControlButton
              onClick={({ onPageChange, currentPageNumber: curPageNum }) => {
                onPageChange(curPageNum - 1);
              }}
              disabled={currentPageNumber === 1}
            >
              <ChevronLeft />
            </IconControlButton>
            {getPaginationSymbols({ totalPageCount, currentPageNumber, siblingCount: clampedSiblingCount }).map(
              renderCentralButton
            )}
            <IconControlButton
              onClick={({ onPageChange, currentPageNumber: curPageNum }) => {
                onPageChange(curPageNum + 1);
              }}
              disabled={currentPageNumber === totalPageCount}
            >
              {<ChevronRight />}
            </IconControlButton>
          </>
        )}
      </Group>
    );
  }
);
