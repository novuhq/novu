import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGE_SIZE, DEFAULT_PAGINATION_PAGE_SIZES, FIRST_PAGE_NUMBER } from './Pagination.const';

const URL_PARAM_NAME_PAGE_SIZE = 'size';
const URL_PARAM_NAME_PAGE_NUMBER = 'page';
export interface IUsePaginationStateOptions {
  areSearchParamsEnabled?: boolean;
  startingPageNumber?: number;
  startingPageSize?: number;
  pageSizes?: number[];
  pageSizeParamName?: string;
  pageNumberParamName?: string;
}

export const usePaginationState = ({
  areSearchParamsEnabled = true,
  startingPageNumber = FIRST_PAGE_NUMBER,
  startingPageSize = DEFAULT_PAGE_SIZE,
  pageSizes = DEFAULT_PAGINATION_PAGE_SIZES,
  pageNumberParamName = URL_PARAM_NAME_PAGE_NUMBER,
  pageSizeParamName = URL_PARAM_NAME_PAGE_SIZE,
}: IUsePaginationStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageSize, setPageSize] = useState<number>(
    getValidatedPageSizeFromUrl(searchParams.get(pageSizeParamName), startingPageSize, pageSizes)
  );
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(
    getValidatedPageNumberFromUrl(searchParams.get(pageNumberParamName), startingPageNumber)
  );

  useEffect(() => {
    if (!areSearchParamsEnabled) {
      return;
    }

    setSearchParams(
      {
        [pageNumberParamName]: `${currentPageNumber}`,
        [pageSizeParamName]: `${pageSize}`,
      },
      { replace: true }
    );
  }, [pageSize, currentPageNumber, setSearchParams, pageNumberParamName, pageSizeParamName]);

  return {
    pageSize,
    currentPageNumber,
    setPageSize,
    setCurrentPageNumber,
  };
};

function getValidatedPageNumberFromUrl(pageNumberStr: string | undefined, startingPageNumber: number): number {
  const pageNumberUnchecked = parseInt(pageNumberStr ?? 'NaN', 10);

  return pageNumberUnchecked && pageNumberUnchecked > 0 ? pageNumberUnchecked : startingPageNumber;
}

function getValidatedPageSizeFromUrl(
  pageSizeStr: string | undefined,
  startingPageSize: number,
  pageSizes: number[]
): number {
  const sizeValUnchecked = parseInt(pageSizeStr ?? 'NaN', 10);

  return pageSizes.includes(sizeValUnchecked) && sizeValUnchecked > 0
    ? sizeValUnchecked
    : startingPageSize ?? pageSizes[0];
}
