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

  // determine if the current page is close enough to either end to omit the ellipsis
  const windowRange = getWindowRange(siblingCount);
  const isInRangeOfFirstPage = checkIfCurrentPageIsNearStart({ currentPageNumber, windowRange });
  const isInRangeOfLastPage = checkIfCurrentPageIsNearEnd({
    currentPageNumber,
    windowRange,
    totalPageCount,
  });

  // determine how many values to show (not inluding first and last)
  const windowSize = getWindowSize({
    totalPageCount,
    siblingCount,
    isInRangeOfFirstPage,
    isInRangeOfLastPage,
  });

  /*
   * determine where the window should start -- this behave differently depending on if
   * the current page is in the middle or within range of either end
   */
  const windowStart = getWindowStart({
    windowSize,
    currentPageNumber,
    totalPageCount,
    isInRangeOfFirstPage,
    isInRangeOfLastPage,
  });
  const pageSymbols: PaginationSymbol[] = createArrayForRange(windowSize, windowStart);

  // add first page and ellipsis at the beginning
  if (!isInRangeOfFirstPage) {
    pageSymbols.unshift('ELLIPSIS');
  }

  // add ellipsis and last page at the end
  if (!isInRangeOfLastPage) {
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
  windowRange,
  totalPageCount,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & { windowRange: number }) {
  return totalPageCount - currentPageNumber < windowRange;
}

/** Determines if the current page is within a range of the first page */
function checkIfCurrentPageIsNearStart({
  currentPageNumber,
  windowRange,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount' | 'totalPageCount'> & { windowRange: number }) {
  return currentPageNumber - FIRST_PAGE_NUMBER < windowRange;
}

interface TInPaginationRangeParams {
  isInRangeOfFirstPage: boolean;
  isInRangeOfLastPage: boolean;
}

/** Determines the quantity of page numbers to show, ignoring the first and last pages (which are always shown) */
function getWindowSize({
  siblingCount,
  totalPageCount,
  isInRangeOfFirstPage,
  isInRangeOfLastPage,
}: Omit<TGetPaginationSymbolsParams, 'currentPageNumber'> & TInPaginationRangeParams) {
  if (totalPageCount <= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS) {
    return totalPageCount;
  }

  // window size in the middle of the range
  const windowSize = siblingCount * 2 + 1;

  // determine if there's it's necessary to subsititute the ellipsis with an additional page number
  const numReplacementSlots = isInRangeOfFirstPage || isInRangeOfLastPage ? 1 : 0;

  return windowSize + numReplacementSlots;
}

/**
 * Gets the "distance" within which the current page number is considered to be in range of the first or last page.
 * This stems from replicating MaterialUI's implementation which has multiple layers of nuance.
 */
function getWindowRange(siblingCount: number) {
  return siblingCount * 2 + (3 - siblingCount);
}

/**
 * Determines the first page number that will be included in the viewing window, ignoring the first and last page.
 *
 * For example, if the goal is to display 3 4 5 6 7, this function will return 3.
 */
function getWindowStart({
  windowSize,
  currentPageNumber,
  totalPageCount,
  isInRangeOfFirstPage,
  isInRangeOfLastPage,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & {
  windowSize: number;
} & TInPaginationRangeParams) {
  if (isInRangeOfLastPage) {
    return totalPageCount - windowSize;
  } else if (isInRangeOfFirstPage) {
    return FIRST_PAGE_NUMBER + 1;
  }
  const windowOffset = Math.ceil(windowSize / 2) - 1;

  return Math.max(currentPageNumber - windowOffset, 1);
}
