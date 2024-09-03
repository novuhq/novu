import { URLSearchParamsInit, useSearchParams } from 'react-router-dom';

import { useSegment } from '../../../../../components/providers/SegmentProvider';

import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';

const TAB_SEARCH_PARAM_NAME = 'tab';
const DEFAULT_TAB: OnboardingUseCasesTabsEnum = OnboardingUseCasesTabsEnum.FRAMEWORK;

interface GetStartedTabSearchParams {
  [TAB_SEARCH_PARAM_NAME]: OnboardingUseCasesTabsEnum;
}

const DEFAULT_PARAMS: GetStartedTabSearchParams = {
  [TAB_SEARCH_PARAM_NAME]: DEFAULT_TAB,
} satisfies URLSearchParamsInit;

export const useGetStartedTabs = () => {
  const [params, setParams] = useSearchParams(DEFAULT_PARAMS as unknown as URLSearchParamsInit);
  const segment = useSegment();

  const currentTab = (params.get(TAB_SEARCH_PARAM_NAME) as OnboardingUseCasesTabsEnum) ?? DEFAULT_TAB;
  const setTab = (tab: OnboardingUseCasesTabsEnum) => {
    segment.track('Tab click - [Get Started]', { tab });

    params.set(TAB_SEARCH_PARAM_NAME, tab);

    setParams(
      params,
      // replace is used so that changing the search params isn't considered a change in page
      { replace: true }
    );
  };

  return {
    currentTab,
    setTab,
  };
};
