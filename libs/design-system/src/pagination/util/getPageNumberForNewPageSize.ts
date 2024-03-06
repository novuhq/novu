import { IPaginationContext } from '../PaginationContext';

export interface IAdjustedPageNumParams extends Pick<IPaginationContext, 'currentPageNumber' | 'totalItemCount'> {
  newPageSize: number;
  prevPageSize: number;
}

/**
 * Get the adjusted page number such that the beginning of the previous item viewing range is still visible.
 *
 * For example, if the user has a pageSize: 10 and currentPageNumber: 4 and changes the page size to 25,
 * this function will return 2 because page 2 will show items 26-50, and previously the user could see items 31-40,
 */
export const getPageNumberForNewPageSize = ({
  newPageSize,
  prevPageSize,
  totalItemCount,
  currentPageNumber,
}: IAdjustedPageNumParams): number => {
  const minPageNumOfCurrentRange = (currentPageNumber - 1) * prevPageSize + 1;
  const newTotalPageCount = Math.ceil(totalItemCount / newPageSize);

  return Math.min(Math.ceil(minPageNumOfCurrentRange / newPageSize), newTotalPageCount);
};
