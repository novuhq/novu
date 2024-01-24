import { IPaginationContext } from '../PaginationContext';

export type PaginationSymbol = number | 'ELLIPSIS';

// FIXME: MOVE ME SOMEWHERE BETTER!
const FIRST_PAGE_NUMBER = 1;
const MAX_PAGE_COUNT_WITHOUT_ELLIPSIS = 10;

type TGetPaginationSymbolsParams = Pick<IPaginationContext, 'totalPageCount' | 'currentPageNumber'> & {
  siblingCount: number;
};

const createArrayForRange = (length: number, baseValue = 1) => Array.from({ length }, (_, i) => i + baseValue);

const getExpectedCenterWindowSize = ({
  siblingCount,
  currentPageNumber,
  totalPageCount,
}: TGetPaginationSymbolsParams) => {
  if (currentPageNumber <= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS) {
    return totalPageCount;
  } else if (currentPageNumber >= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS && currentPageNumber < 100) {
    return siblingCount * 2 + 2;
  } else if (currentPageNumber >= 100 && currentPageNumber < 1000) {
    return siblingCount * 2 + 1;
  } else if (currentPageNumber >= 1000 && currentPageNumber < 10000) {
    return siblingCount * 2;
  }

  return Math.max(1, siblingCount * 2 - 1);
};

const getWindowStart = (currentPageNumber: number, expectedWindowSize: number) =>
  Math.max(currentPageNumber - Math.ceil(expectedWindowSize / 2) + 1, 1);

export const getPaginationSymbols = ({
  totalPageCount,
  siblingCount,
  currentPageNumber,
}: TGetPaginationSymbolsParams): PaginationSymbol[] => {
  const expectedWindowSize = getExpectedCenterWindowSize({ totalPageCount, siblingCount, currentPageNumber });

  const windowStart = getWindowStart(currentPageNumber, expectedWindowSize);
  const pageSymbols: PaginationSymbol[] = createArrayForRange(expectedWindowSize, windowStart);

  if (totalPageCount <= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS) {
    return pageSymbols;
  }

  // const totalSymbolsLength = calcTotalSymbolsLength(expectedWindowSize);

  // add ellipsis and last page at the end
  if (totalPageCount - currentPageNumber >= expectedWindowSize) {
    pageSymbols.push('ELLIPSIS');
    pageSymbols.push(totalPageCount);
  }

  // add first page and ellipsis at the beginning

  // FIXME: there has to be a better way to do this, but need more info from Nikolay!
  if (currentPageNumber > FIRST_PAGE_NUMBER) {
    pageSymbols.unshift('ELLIPSIS');
    pageSymbols.unshift(FIRST_PAGE_NUMBER);
  }

  return pageSymbols;
};
