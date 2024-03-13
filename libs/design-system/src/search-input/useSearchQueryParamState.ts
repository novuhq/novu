import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const URL_SEARCH_QUERY_PARAM_NAME = 'q';

const getInitialSearchQueryParamValue = (searchParam?: string, initialSearchQueryParam?: string) => {
  const search = searchParam ?? initialSearchQueryParam?.trim();

  return search ?? '';
};

export interface IUseSearchQueryParamStateOptions {
  areSearchParamsEnabled?: boolean;
  initialSearchQueryParam?: string;
  defaultSearchQueryParamName?: string;
}

export const useSearchQueryParamState = ({
  areSearchParamsEnabled = true,
  initialSearchQueryParam,
  defaultSearchQueryParamName = URL_SEARCH_QUERY_PARAM_NAME,
}: IUseSearchQueryParamStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQueryParam, setSearchQueryParam] = useState(() =>
    getInitialSearchQueryParamValue(searchParams.get(defaultSearchQueryParamName), initialSearchQueryParam)
  );

  const setSearchQueryParamCallback = useCallback(
    (newSearch: string) => setSearchQueryParam(newSearch.trimStart()),
    [setSearchQueryParam]
  );

  useEffect(() => {
    if (!areSearchParamsEnabled) {
      return;
    }

    // make sure that the other query params are not overridden
    const newSearchParams = new URLSearchParams(document.location.search);
    if (searchQueryParam) {
      newSearchParams.set(defaultSearchQueryParamName, searchQueryParam);
    } else {
      newSearchParams.delete(defaultSearchQueryParamName);
    }

    setSearchParams(newSearchParams, { replace: true });
  }, [areSearchParamsEnabled, defaultSearchQueryParamName, searchQueryParam, setSearchParams]);

  return {
    searchQueryParam,
    setSearchQueryParam: setSearchQueryParamCallback,
  };
};
