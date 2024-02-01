import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface IUsePaginationOptions {
  startingPageNumber?: number;
  pageSizes?: number[];
  pageSizeParamName?: string;
  currentPageNumberParamName?: string;
  shouldUseUrlParams?: boolean;
}

export const DEFAULT_URL_PARAM_NAME_PAGE_SIZE = 'size';
export const DEFAULT_URL_PARAM_NAME_PAGE_NUMBER = 'page';
const DEFAULT_USE_PAGINATION_OPTIONS: Required<IUsePaginationOptions> = {
  startingPageNumber: 1,
  pageSizes: [10, 25, 50, 100],
  pageSizeParamName: DEFAULT_URL_PARAM_NAME_PAGE_SIZE,
  currentPageNumberParamName: DEFAULT_URL_PARAM_NAME_PAGE_NUMBER,
  shouldUseUrlParams: true,
};

const convertNumberedParamsToURLSearchParams = (
  numberParams: Record<string, string | number>,
  defaultParams: URLSearchParams = {} as URLSearchParams
): URLSearchParams => {
  return Object.entries(numberParams).reduce((outputParams, [paramName, paramValue]) => {
    return {
      ...outputParams,
      [paramName]: `${paramValue}`,
    };
  }, defaultParams);
};

const useNumberSearchParams = (
  paramsWithDefaults: Record<string, number>
): [typeof paramsWithDefaults, (val: typeof paramsWithDefaults) => void] => {
  const [searchParams, setSearchParams] = useSearchParams(convertNumberedParamsToURLSearchParams(paramsWithDefaults));

  const safeguardedParams = useMemo(
    () =>
      Object.entries(paramsWithDefaults).reduce((outputParams, [paramName, defaultValue]) => {
        const paramValue = parseInt(searchParams.get(paramName) ?? 'NaN', 10);
        const isValidInteger = !isNaN(paramValue) && Number.isInteger(paramValue);

        return {
          ...outputParams,
          [paramName]: isValidInteger ? paramValue : defaultValue,
        };
      }, {} as typeof paramsWithDefaults),
    [paramsWithDefaults, searchParams]
  );

  const setNumberSearchParams = useCallback(
    (numberParams: Record<keyof typeof paramsWithDefaults, number>) => {
      setSearchParams(convertNumberedParamsToURLSearchParams(numberParams, searchParams), { replace: true });
    },
    [searchParams, setSearchParams]
  );

  return [safeguardedParams, setNumberSearchParams];
};
export const usePaginationState = ({
  pageSizeParamName = DEFAULT_USE_PAGINATION_OPTIONS.pageSizeParamName,
  currentPageNumberParamName = DEFAULT_USE_PAGINATION_OPTIONS.currentPageNumberParamName,
  startingPageNumber = DEFAULT_USE_PAGINATION_OPTIONS.startingPageNumber,
  pageSizes = DEFAULT_USE_PAGINATION_OPTIONS.pageSizes,
  shouldUseUrlParams = DEFAULT_USE_PAGINATION_OPTIONS.shouldUseUrlParams,
}: IUsePaginationOptions) => {
  const [searchParams, setSearchParams] = useNumberSearchParams({
    [pageSizeParamName]: pageSizes[0],
    [currentPageNumberParamName]: startingPageNumber,
  });
  const savedPageSize = searchParams[pageSizeParamName];
  const savedCurrentPageNumber = searchParams[currentPageNumberParamName];

  const [currentPageNumber, setCurrentPageNumber] = useState<number>(startingPageNumber);
  const [pageSize, setPageSize] = useState<number>(pageSizes[0]);

  useEffect(() => {
    if (!shouldUseUrlParams) {
      return;
    }

    if (pageSizes.includes(savedPageSize)) {
      setPageSize(savedPageSize);
    }
    setCurrentPageNumber(savedCurrentPageNumber);

    // should only be run on mount to avoid infinite loop!
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!shouldUseUrlParams) {
      return;
    }

    setSearchParams({
      [pageSizeParamName]: pageSize,
      [currentPageNumberParamName]: currentPageNumber,
    });
  }, [shouldUseUrlParams, setSearchParams, pageSizeParamName, pageSize, currentPageNumberParamName, currentPageNumber]);

  return {
    currentPageNumber,
    pageSize,
    setPageSize,
    setCurrentPageNumber,
  };
};
