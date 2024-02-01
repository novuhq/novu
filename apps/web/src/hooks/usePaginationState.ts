import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const URL_PARAM_NAME_PAGE_SIZE = 'size';
const URL_PARAM_NAME_PAGE_NUMBER = 'page';
export interface IUsePaginationOptions {
  startingPageNumber?: number;
  pageSizes?: number[];
  pageSizeParamName?: string;
  pageNumberParamName?: string;
}

export const usePaginationState = ({
  startingPageNumber = 1,
  pageSizes = [10, 25, 50, 100],
  pageNumberParamName = URL_PARAM_NAME_PAGE_NUMBER,
  pageSizeParamName = URL_PARAM_NAME_PAGE_SIZE,
}: IUsePaginationOptions) => {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
