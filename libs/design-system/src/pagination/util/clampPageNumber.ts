import { clamp } from '../../utils';
import { FIRST_PAGE_NUMBER } from '../Pagination.const';
import { IPaginationContext } from '../PaginationContext';

/**
 * Ensure that the page number is within the safe bounds of the total page count.
 */
export const clampPageNumber = (
  newPageNum: number,
  { totalPageCount, currentPageNumber }: Pick<IPaginationContext, 'totalPageCount' | 'currentPageNumber'>,
  firstPageNumber: number = FIRST_PAGE_NUMBER
): number => {
  if (!Number.isInteger(newPageNum)) {
    return !Number.isInteger(currentPageNumber)
      ? firstPageNumber
      : clamp(currentPageNumber, firstPageNumber, totalPageCount);
  }

  return clamp(newPageNum, firstPageNumber, totalPageCount);
};
