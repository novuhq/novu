import { FIRST_PAGE_NUMBER, MAX_PAGE_COUNT_WITHOUT_ELLIPSIS } from '../Pagination.const';
import { IPaginationContext } from '../PaginationContext';

/** 'ELLIPSIS' is used to indicate that there are page numbers between the adjacent values that are not being shown. */
export type PaginationSymbol = number | 'ELLIPSIS';

type TGetPaginationSymbolsParams = Pick<IPaginationContext, 'totalPageCount' | 'currentPageNumber'> & {
  siblingCount: number;
};

/**
 * Top-level function to determine what values should be used for a pagination ControlBar.
 * 'ELLIPSIS' is used to indicate that there are page numbers between the adjacent values that are not being shown.
 *
 * For example, if the totalPageCount is 11, the currentPageNumber is 6, the siblingCount is 2, this function will return:
 * [1, 'ELLIPSIS', 4, 5, 6, 7, 8, 'ELLIPSIS', 11]
 */
export const getPaginationSymbols = ({
  totalPageCount,
  siblingCount,
  currentPageNumber,
}: TGetPaginationSymbolsParams): PaginationSymbol[] => {
  // show every page if we have {MAX_PAGE_COUNT_WITHOUT_ELLIPSIS} or fewer
  if (totalPageCount <= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS) {
    return createArrayForRange(totalPageCount);
  }

  const windowSize = getWindowSize({ totalPageCount, siblingCount, currentPageNumber });
  const windowStart = getWindowStart({ currentPageNumber, windowSize, totalPageCount });
  const pageSymbols: PaginationSymbol[] = createArrayForRange(windowSize, windowStart);

  // add first page and ellipsis at the beginning
  if (!checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize })) {
    pageSymbols.unshift('ELLIPSIS');
  }

  // add ellipsis and last page at the end
  if (!checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount })) {
    pageSymbols.push('ELLIPSIS');
  }

  // add first and last page numbers
  pageSymbols.unshift(FIRST_PAGE_NUMBER);
  pageSymbols.push(totalPageCount);

  return pageSymbols;
};

/**
 * Note: the `function` keyword is used below to leverage function hoisting for helper functions.
 */

/** Creates an array of specified length where each value is baseValue + its index */
function createArrayForRange(length: number, baseValue = 1) {
  return Array.from({ length }, (_, i) => i + baseValue);
}

/** Determines if the current page is within a range of the totalPageCount */
function checkIfCurrentPageIsNearEnd({
  currentPageNumber,
  windowSize,
  totalPageCount,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & { windowSize: number }) {
  return totalPageCount - currentPageNumber < windowSize;
}

/** Determines if the current page is within a range of the first page */
function checkIfCurrentPageIsNearStart({
  currentPageNumber,
  windowSize,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount' | 'totalPageCount'> & { windowSize: number }) {
  return currentPageNumber - FIRST_PAGE_NUMBER < windowSize;
}

/** Determines the quantity of page numbers to show, ignoring the first and last pages */
function getWindowSize({ siblingCount, currentPageNumber, totalPageCount }: TGetPaginationSymbolsParams) {
  if (totalPageCount <= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS) {
    return totalPageCount;
  }

  const windowSize = siblingCount * 2 + 1;

  // determine if there's it's necessary to subsititute the ellipsis with an additional page number
  const numReplacementSlots =
    checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount }) ||
    checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize })
      ? 1
      : 0;

  return windowSize + numReplacementSlots;
}

/**
 * Determines the first page number that will be included in the viewing window, ignoring the first and last page.
 *
 * For example, if the goal is to display 3 4 5 6 7, this function will return 3.
 */
function getWindowStart({
  currentPageNumber,
  windowSize,
  totalPageCount,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & { windowSize: number }) {
  if (checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount })) {
    return totalPageCount - windowSize;
  } else if (checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize })) {
    return FIRST_PAGE_NUMBER + 1;
  }
  const windowOffset = Math.ceil(windowSize / 2) - 1;

  return Math.max(currentPageNumber - windowOffset, 1);
}
