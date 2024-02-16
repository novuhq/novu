import { URLSearchParamsInit, useSearchParams } from 'react-router-dom';
import { GetStartedTabsViewsEnum } from '../../consts/GetStartedTabsViewsEnum';

const TAB_VIEW_SEARCH_PARAM_NAME = 'v';

interface GetStartedTabSearchParams {
  [TAB_VIEW_SEARCH_PARAM_NAME]?: GetStartedTabsViewsEnum;
}

const DEFAULT_PARAMS: GetStartedTabSearchParams = {} satisfies URLSearchParamsInit;

export const useGetStartedTabView = () => {
  const [params, setParams] = useSearchParams(DEFAULT_PARAMS as unknown as URLSearchParamsInit);

  const currentView = params.get(TAB_VIEW_SEARCH_PARAM_NAME) as GetStartedTabsViewsEnum | undefined;
  const setView = (view: GetStartedTabsViewsEnum | null) => {
    if (view === null) {
      params.delete(TAB_VIEW_SEARCH_PARAM_NAME);
    } else {
      params.set(TAB_VIEW_SEARCH_PARAM_NAME, view);
    }

    setParams(
      params,
      // replace is used so that changing the search params isn't considered a change in page
      { replace: true }
    );
  };

  return {
    currentView,
    setView,
  };
};
