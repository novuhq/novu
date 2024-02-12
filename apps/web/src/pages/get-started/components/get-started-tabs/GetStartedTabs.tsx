import { Container, Tabs } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { OnboardingUseCasesTabsEnum } from '../../consts/OnboardingUseCasesTabsEnum';
import { UseCasesConst } from '../../consts/UseCases.const';
import { GetStartedTab } from '../../layout/GetStartedTab';
import { GetStartedTabConfig, TAB_CONFIGS } from './GetStartedTabs.const';
import useStyles from './GetStartedTabs.style';

interface IGetStartedTabsProps {
  tabConfigs?: GetStartedTabConfig[];
  currentTab: OnboardingUseCasesTabsEnum;
  setTab: (tab: OnboardingUseCasesTabsEnum) => void;
}

export const GetStartedTabs: React.FC<IGetStartedTabsProps> = ({ tabConfigs = TAB_CONFIGS, currentTab, setTab }) => {
  const { classes } = useStyles();

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
};
