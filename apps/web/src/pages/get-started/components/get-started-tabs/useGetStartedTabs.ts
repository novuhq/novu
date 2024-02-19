import { URLSearchParamsInit, useSearchParams } from 'react-router-dom';

import { useSegment } from '@novu/shared-web';

import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';

const TAB_SEARCH_PARAM_NAME = 'tab';
const DEFAULT_TAB: OnboardingUseCasesTabsEnum = OnboardingUseCasesTabsEnum.IN_APP;

interface GetStartedTabSearchParams {
  [TAB_SEARCH_PARAM_NAME]: OnboardingUseCasesTabsEnum;
}

const DEFAULT_PARAMS: GetStartedTabSearchParams = {
  [TAB_SEARCH_PARAM_NAME]: DEFAULT_TAB,
} satisfies URLSearchParamsInit;

export const useTabSearchParams = () => {
  const [params, setParams] = useSearchParams(DEFAULT_PARAMS as unknown as URLSearchParamsInit);
  const segment = useSegment();

  const setTab = (tab: OnboardingUseCasesTabsEnum) => {
    segment.track('Click Use-case Tab - [Get Started]', { tab: tab });

    // replace is used so that changing the search params isn't considered a change in page
    setParams({ [TAB_SEARCH_PARAM_NAME]: tab }, { replace: true });
  };

  const currentTab = (params.get(TAB_SEARCH_PARAM_NAME) as OnboardingUseCasesTabsEnum) ?? DEFAULT_TAB;

  return {
    currentTab,
    setTab,
  };
};
