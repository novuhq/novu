import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

const URL_PARAM_NAME_PAGE_SIZE = 'size';
const URL_PARAM_NAME_PAGE_NUMBER = 'page';
export interface IUsePaginationOptions {
  startingPageNumber?: number;
  pageSizes?: number[];
  pageSizeParamName?: string;
  pageNumberParamName?: string;
}

export function useSearchParamsState(
  searchParamName: string,
  defaultValue: number
): readonly [number, (newState: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams({ [searchParamName]: `${defaultValue}` });

  const acquiredSearchParam = searchParams.get(searchParamName);
  const searchParamsState = acquiredSearchParam ? +acquiredSearchParam : defaultValue;

  const setSearchParamsState = useCallback(
    (newVal: number) => {
      const next = Object.assign(
        {},
        Object.entries(Object.fromEntries(searchParams)).reduce(
          (outputParams, [key, value]) => ({ ...outputParams, [key]: value }),
          {}
        ),
        { [searchParamName]: `${newVal}` }
      );
      setSearchParams(next, { replace: true });
    },
    [searchParamName, searchParams, setSearchParams]
  );

  return [searchParamsState, setSearchParamsState];
}

export const usePaginationState = ({
  startingPageNumber = 1,
  pageSizes = [10, 25, 50, 100],
  pageNumberParamName = URL_PARAM_NAME_PAGE_NUMBER,
  pageSizeParamName = URL_PARAM_NAME_PAGE_SIZE,
}: IUsePaginationOptions) => {
  const [pageSize, setPageSize] = useSearchParamsState(pageSizeParamName, pageSizes[0]);
  const [currentPageNumber, setCurrentPageNumber] = useSearchParamsState(pageNumberParamName, startingPageNumber);

  return {
    currentPageNumber,
    pageSize,
    setPageSize,
    setCurrentPageNumber,
  };
};
