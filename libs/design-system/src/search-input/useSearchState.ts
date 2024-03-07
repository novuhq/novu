import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const URL_PARAM_NAME_SEARCH = 'query';

const getInitialSearchValue = (searchParam?: string, startingSearch?: string) => {
  const search = searchParam ?? startingSearch?.trim();

  return decodeURI(search ?? '');
};

export interface IUseSearchStateOptions {
  areSearchParamsEnabled?: boolean;
  startingSearch?: string;
  searchParamName?: string;
}

export const useSearchState = ({
  areSearchParamsEnabled = true,
  startingSearch,
  searchParamName = URL_PARAM_NAME_SEARCH,
}: IUseSearchStateOptions) => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(getInitialSearchValue(searchParams.get(searchParamName), startingSearch));

  const setSearchCallback = useCallback((newSearch: string) => setSearch(newSearch.trimStart()), [setSearch]);

  useEffect(() => {
    if (!areSearchParamsEnabled) {
      return;
    }

    const newSearchParams = new URLSearchParams(document.location.search);
    newSearchParams.set(searchParamName, search);

    setSearchParams(newSearchParams, { replace: true });
  }, [areSearchParamsEnabled, searchParamName, search, setSearchParams]);

  return {
    search,
    setSearch: setSearchCallback,
  };
};
