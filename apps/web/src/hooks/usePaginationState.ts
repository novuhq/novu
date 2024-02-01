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

export function useSearchParamsState({
  startingPageNumber,
  pageNumberParamName,
  pageSizeParamName,
  pageSizes,
}: Required<IUsePaginationOptions>) {
  const [searchParams, setSearchParams] = useSearchParams();

  const getParamVal = (name: string, defaultValue: number) => {
    const param = searchParams.get(name);

    return param ? +param : defaultValue;
  };

  const setSearchParamsState = (searchParamName: string) => (newVal: number) => {
    const next = Object.assign(
      {},
      Object.entries(Object.fromEntries(searchParams)).reduce(
        (outputParams, [key, value]) => ({ ...outputParams, [key]: value }),
        {}
      ),
      { [searchParamName]: `${newVal}` }
    );
    setSearchParams(next, { replace: true });
  };

  const pageSize = getParamVal(pageSizeParamName, pageSizes[0]);
  const currentPageNumber = getParamVal(pageNumberParamName, startingPageNumber);

  return {
    pageSize,
    currentPageNumber,
    setPageSize: setSearchParamsState(pageSizeParamName),
    setCurrentPageNumber: setSearchParamsState(pageNumberParamName),
  };
}

export const usePaginationState = ({
  startingPageNumber = 1,
  pageSizes = [10, 25, 50, 100],
  pageNumberParamName = URL_PARAM_NAME_PAGE_NUMBER,
  pageSizeParamName = URL_PARAM_NAME_PAGE_SIZE,
}: IUsePaginationOptions) => {
  const { pageSize, setPageSize, currentPageNumber, setCurrentPageNumber } = useSearchParamsState({
    startingPageNumber,
    pageSizes,
    pageSizeParamName,
    pageNumberParamName,
  });

  return {
    currentPageNumber,
    pageSize,
    setPageSize,
    setCurrentPageNumber,
  };
};
