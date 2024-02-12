import { Outlet, URLSearchParamsInit, useSearchParams } from 'react-router-dom';
import { Center, Container, Loader, Tabs } from '@mantine/core';

import { colors } from '@novu/design-system';

import { useAuthContext } from '../../../../components/providers/AuthProvider';
import useStyles from './GetStartedTabs.style';
import { GetStartedTab } from '../../layout/GetStartedTab';
import { UseCasesConst } from '../../consts/UseCases.const';
import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';
import { GetStartedTabConfig, TAB_CONFIGS } from './GetStartedTabs.const';

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

export function GetStartedTabs({ tabConfigs = TAB_CONFIGS }: { tabConfigs?: GetStartedTabConfig[] }) {
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
          {tabConfigs.map(({ value, icon, title }) => (
            <Tabs.Tab key={`tab-${value}`} value={value} icon={icon}>
              {title}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        {tabConfigs.map(({ value }) => (
          <Tabs.Panel key={`tab-panel-${value}`} value={value}>
            {<GetStartedTab {...UseCasesConst[value]} />}
          </Tabs.Panel>
        ))}
      </Tabs>
      <Outlet />
    </Container>
  );
}
