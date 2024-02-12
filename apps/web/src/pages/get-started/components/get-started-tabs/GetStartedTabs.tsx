import { Outlet, URLSearchParamsInit, useSearchParams } from 'react-router-dom';
import { Center, Container, Loader, Tabs } from '@mantine/core';

import { colors, Digest, HalfClock, MultiChannel, RingingBell, Translation } from '@novu/design-system';

import { useAuthContext } from '../../../../components/providers/AuthProvider';
import { OnboardingUseCasesTabsEnum } from '../../../../constants/onboarding-tabs';
import useStyles from './GetStartedTabs.style';
import { CSSProperties } from 'react';

const TAB_SEARCH_PARAM_NAME = 'tab';
const DEFAULT_TAB: OnboardingUseCasesTabsEnum = OnboardingUseCasesTabsEnum.IN_APP;

interface GetStartedTabSearchParams {
  [TAB_SEARCH_PARAM_NAME]: OnboardingUseCasesTabsEnum;
}

const DEFAULT_PARAMS: GetStartedTabSearchParams = {
  [TAB_SEARCH_PARAM_NAME]: DEFAULT_TAB,
} satisfies URLSearchParamsInit;

const useTabSearchParams = () => {
  const [params, setParams] = useSearchParams(DEFAULT_PARAMS as unknown as URLSearchParamsInit);

  const setTab = (tab: OnboardingUseCasesTabsEnum) => {
    setParams({ [TAB_SEARCH_PARAM_NAME]: tab });
  };

  const currentTab = (params.get(TAB_SEARCH_PARAM_NAME) as OnboardingUseCasesTabsEnum) ?? DEFAULT_TAB;

  return {
    currentTab,
    setTab,
  };
};

const ICON_STYLE: Partial<CSSProperties> = { height: 20, width: 20, marginBottom: '12px' };
const TAB_CONFIGS = [
  {
    value: OnboardingUseCasesTabsEnum.IN_APP,
    icon: <RingingBell style={ICON_STYLE} />,
    title: 'In-app',
  },
  {
    value: OnboardingUseCasesTabsEnum.MULTI_CHANNEL,
    icon: <MultiChannel style={ICON_STYLE} />,
    title: 'Multi-channel',
  },
  {
    value: OnboardingUseCasesTabsEnum.DIGEST,
    icon: <Digest style={ICON_STYLE} />,
    title: 'Digest',
  },
  {
    value: OnboardingUseCasesTabsEnum.DELAY,
    icon: <HalfClock style={ICON_STYLE} />,
    title: 'Delay',
  },
  {
    value: OnboardingUseCasesTabsEnum.TRANSLATION,
    icon: <Translation style={ICON_STYLE} />,
    title: 'Translate',
  },
];

export function GetStartedTabs() {
  const { currentOrganization } = useAuthContext();
  const { classes } = useStyles();
  const { currentTab, setTab } = useTabSearchParams();

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <Container fluid mt={15} ml={5}>
      <Tabs
        orientation="horizontal"
        keepMounted={true}
        onTabChange={(tabValue: OnboardingUseCasesTabsEnum) => {
          setTab(tabValue);
        }}
        variant="default"
        value={currentTab}
        classNames={classes}
        mb={15}
      >
        <Tabs.List>
          {TAB_CONFIGS.map(({ value, icon, title }) => (
            <Tabs.Tab value={value} icon={icon}>
              {title}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>
      <Outlet />
    </Container>
  );
}
