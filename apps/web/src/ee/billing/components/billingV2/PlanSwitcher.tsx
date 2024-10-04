import { MantineTheme, Tabs, useMantineTheme } from '@mantine/core';
import { Title } from '@novu/novui';
import { css } from '@novu/novui/css';

export const PlanSwitcher = ({
  theme,
  selectedBillingInterval,
  setSelectedBillingInterval,
}: {
  theme: MantineTheme;
  selectedBillingInterval: 'month' | 'year';
  setSelectedBillingInterval: (value: 'month' | 'year') => void;
}) => (
  <div className={styles.planSwitcherContainer(theme)}>
    <Title variant="section" className={styles.planHeaderTitle}>
      All plans
    </Title>
    <div className={styles.tabsWrapper}>
      <Tabs classNames={styles.tabs} onTabChange={setSelectedBillingInterval} value={selectedBillingInterval}>
        <Tabs.List>
          <Tabs.Tab className={styles.tab(theme)} value="month">
            Monthly
          </Tabs.Tab>
          <Tabs.Tab className={styles.tab(theme)} value="year">
            Annually <span>10% off</span>
          </Tabs.Tab>
        </Tabs.List>
      </Tabs>
    </div>
  </div>
);

const styles = {
  planSwitcherContainer: (theme: MantineTheme) =>
    css({
      position: 'relative',
      display: 'flex',
      height: '40px',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      alignSelf: 'stretch',
      borderBottom: theme.colorScheme === 'dark' ? '1px solid #34343A' : '1px solid #e4e2e4ff',
    }),
  planHeaderTitle: css({
    position: 'absolute',
    left: '0',
    top: '0',
  }),
  tabsWrapper: css({
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
  }),
  tabs: {
    tabsList: css({
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-end',
      flex: '1 0 0',
      borderBottom: 'none !important',
    }),
  },
  tab: (theme: MantineTheme) =>
    css({
      padding: '12px !important',
      gap: '8px !important',
      color: 'typography.text.secondary !important',
      fontSize: '14px !important',
      lineHeight: '16px !important',
      '& span': {
        color: 'mode.local.middle',
      },
      '&[data-active="true"]': {
        color: 'typography.text.main !important',
        borderBottom: theme.colorScheme === 'dark' ? '1px solid #FFF !important' : '1px solid #e4e2e4ff !important',
        fontWeight: '600 !important',

        '& span': {
          color: 'mode.local.middle',
          fontWeight: '600',
        },
      },
      '&:hover': {
        color: 'typography.text.main !important',
        backgroundColor: 'transparent !important',

        '& span': {
          color: 'mode.local.middle',
          fontWeight: '600',
        },
      },
    }),
};
