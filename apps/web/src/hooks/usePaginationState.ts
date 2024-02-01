import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface IUsePaginationOptions {
  startingPageNumber?: number;
  pageSizes?: number[];
}

export const URL_PARAM_NAME_PAGE_SIZE = 'size';
export const URL_PARAM_NAME_PAGE_NUMBER = 'page';
export interface IPaginationSearchParams {
  size: number;
  page: number;
}

const test: IPaginationSearchParams = {
  size: 10,
  page: 1,
};

export function useSearchParamsState(
  searchParamName: string,
  defaultValue: number
): readonly [searchParamsState: number, setSearchParamsState: (newState: number) => void] {
  const [searchParams, setSearchParams] = useSearchParams({ [searchParamName]: `${defaultValue}` });

  const acquiredSearchParam = searchParams.get(searchParamName);
  const searchParamsState = acquiredSearchParam ? +acquiredSearchParam : defaultValue;

  const setSearchParamsState = useCallback(
    (newState: number) => {
      const next = Object.assign(
        {},
        Object.entries(Object.fromEntries(searchParams)).reduce(
          (outputParams, [key, value]) => ({ ...outputParams, [key]: value }),
          {}
        ),
        { [searchParamName]: `${newState}` }
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
}: IUsePaginationOptions) => {
  const [pageSize, setPageSize] = useSearchParamsState('size', pageSizes[0]);
  const [currentPageNumber, setCurrentPageNumber] = useSearchParamsState('page', startingPageNumber);

  return {
    currentPageNumber,
    pageSize,
    setPageSize,
    setCurrentPageNumber,
  };
};
