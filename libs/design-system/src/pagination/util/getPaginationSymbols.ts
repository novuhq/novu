import { FIRST_PAGE_NUMBER, MAX_PAGE_COUNT_WITHOUT_ELLIPSIS } from '../Pagination.const';
import { IPaginationContext } from '../PaginationContext';

export type PaginationSymbol = number | 'ELLIPSIS';

type TGetPaginationSymbolsParams = Pick<IPaginationContext, 'totalPageCount' | 'currentPageNumber'> & {
  siblingCount: number;
};

const createArrayForRange = (length: number, baseValue = 1) => Array.from({ length }, (_, i) => i + baseValue);

const checkIfCurrentPageIsNearEnd = ({
  currentPageNumber,
  windowSize,
  totalPageCount,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & { windowSize: number }) => {
  return totalPageCount - currentPageNumber < windowSize;
};

const checkIfCurrentPageIsNearStart = ({
  currentPageNumber,
  windowSize,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount' | 'totalPageCount'> & { windowSize: number }) => {
  return currentPageNumber - FIRST_PAGE_NUMBER < windowSize;
};

const getWindowSize = ({ siblingCount, currentPageNumber, totalPageCount }: TGetPaginationSymbolsParams) => {
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
};

const getWindowStart = ({
  currentPageNumber,
  windowSize,
  totalPageCount,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & { windowSize: number }) => {
  if (checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount })) {
    return totalPageCount - windowSize;
  } else if (checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize })) {
    return FIRST_PAGE_NUMBER + 1;
  }
  const windowOffset = Math.ceil(windowSize / 2) - 1;

  return Math.max(currentPageNumber - windowOffset, 1);
};

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
