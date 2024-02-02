import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DEFAULT_PAGINATION_PAGE_SIZES, FIRST_PAGE_NUMBER } from './Pagination.const';

const URL_PARAM_NAME_PAGE_SIZE = 'size';
const URL_PARAM_NAME_PAGE_NUMBER = 'page';
export interface IUsePaginationStateOptions {
  startingPageNumber?: number;
  pageSizes?: number[];
  pageSizeParamName?: string;
  pageNumberParamName?: string;
}

export const usePaginationState = ({
  startingPageNumber = FIRST_PAGE_NUMBER,
  pageSizes = DEFAULT_PAGINATION_PAGE_SIZES,
  pageNumberParamName = URL_PARAM_NAME_PAGE_NUMBER,
  pageSizeParamName = URL_PARAM_NAME_PAGE_SIZE,
}: IUsePaginationStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [pageSize, setPageSize] = useState<number>(pageSizes[0]);
  const [currentPageNumber, setCurrentPageNumber] = useState<number>(startingPageNumber);

  // Load url params or defaults ONLY on mount
  useEffect(() => {
    const pageStr = searchParams.get(pageNumberParamName);
    const sizeStr = searchParams.get(pageSizeParamName);

    const page = pageStr ? parseInt(pageStr, 10) : startingPageNumber;
    setCurrentPageNumber(page);

    const sizeValUnchecked = parseInt(sizeStr ?? 'NaN', 10);
    const size = pageSizes.includes(sizeValUnchecked) ? sizeValUnchecked : pageSizes[0];
    setPageSize(size);

    // must only be on mount
    // eslint-disable-next-line-react-hooks//exhaustive-deps
  }, []);

  useEffect(() => {
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
