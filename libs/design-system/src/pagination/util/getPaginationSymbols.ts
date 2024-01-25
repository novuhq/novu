import { IPaginationContext } from '../PaginationContext';

export type PaginationSymbol = number | 'ELLIPSIS';

// FIXME: MOVE ME SOMEWHERE BETTER!
const FIRST_PAGE_NUMBER = 1;
const MAX_PAGE_COUNT_WITHOUT_ELLIPSIS = 10;

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
  // FIXME: this is done based on arbitrary guessing based on designs... the 1st example has "4" as a special exception start for the range

  return currentPageNumber - windowSize + 2 < FIRST_PAGE_NUMBER;
};

const getWindowSize = ({ siblingCount, currentPageNumber, totalPageCount }: TGetPaginationSymbolsParams) => {
  if (totalPageCount <= MAX_PAGE_COUNT_WITHOUT_ELLIPSIS) {
    return totalPageCount;
  }

  let windowSize: number;
  if (currentPageNumber < 100) {
    windowSize = siblingCount * 2 + 2;
  } else if (currentPageNumber >= 100 && currentPageNumber < 1000) {
    windowSize = siblingCount * 2 + 1;
  } else if (currentPageNumber >= 1000 && currentPageNumber < 10000) {
    windowSize = siblingCount * 2;
  } else {
    windowSize = Math.max(1, siblingCount * 2 - 1);
  }

  // determine if there's "extra" space by getting rid of the ellipsis at the end and replacing first or last page number
  const numReplacementSlots =
    currentPageNumber > MAX_PAGE_COUNT_WITHOUT_ELLIPSIS &&
    (checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount }) ||
      checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize }))
      ? 2
      : 0;

  return windowSize + numReplacementSlots;
};

const getWindowStart = ({
  currentPageNumber,
  windowSize,
  totalPageCount,
}: Omit<TGetPaginationSymbolsParams, 'siblingCount'> & { windowSize: number }) => {
  if (checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount })) {
    return totalPageCount - windowSize + 1;
  } else if (checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize })) {
    return currentPageNumber;
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

  // FIXME: there has to be a better way to do this, but need more info from Nikolay!

  // if (!checkIfCurrentPageIsNearStart({ currentPageNumber, windowSize })) {
  if (currentPageNumber > 2) {
    pageSymbols.unshift('ELLIPSIS');
  }
  if (currentPageNumber > FIRST_PAGE_NUMBER) {
    pageSymbols.unshift(FIRST_PAGE_NUMBER);
  }

  // add ellipsis and last page at the end
  if (!checkIfCurrentPageIsNearEnd({ currentPageNumber, windowSize, totalPageCount })) {
    pageSymbols.push('ELLIPSIS');
    pageSymbols.push(totalPageCount);
  }

  return pageSymbols;
};
