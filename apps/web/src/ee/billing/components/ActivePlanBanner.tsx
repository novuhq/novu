import { Text, Title } from '@novu/novui';
import { MantineTheme } from '@mantine/core';
import { css } from '@novu/novui/css';
import { UsageProgress } from './UsageProgress';
import { useSubscriptionContext } from './SubscriptionProvider';
import { capitalizeFirstLetter } from '../../../utils/string';
import { Badge } from './Badge';
import { PlanActionButton } from './PlanActionButton';

export const ActivePlanBanner = ({ selectedBillingInterval }: { selectedBillingInterval: 'month' | 'year' }) => {
  const { apiServiceLevel, status, events, trial } = useSubscriptionContext();

  return (
    <div className={styles.activePlanWrapper}>
      <Title variant="section">Active Plan</Title>
      <div className={styles.banner}>
        <div className={styles.content}>
          <PlanHeader apiServiceLevel={apiServiceLevel} isFreeTrialActive={trial.isActive} daysLeft={trial.daysLeft} />
          <PlanInfo apiServiceLevel={apiServiceLevel} currentEvents={events.current} maxEvents={events.included} />
        </div>
        <PlanActions trialEnd={trial.end} status={status} selectedBillingInterval={selectedBillingInterval} />
      </div>
    </div>
  );
};

const PlanHeader = ({ apiServiceLevel, isFreeTrialActive, daysLeft }) => {
  const color = getColorByDaysLeft(daysLeft);

  return (
    <div className={styles.header}>
      <Title variant="section">{capitalizeFirstLetter(apiServiceLevel)}</Title>
      {isFreeTrialActive && (
        <>
          <Badge label="Trial" />
          <div className={styles.daysLeft}>
            <Text className={styles.daysNumber} style={{ color }}>
              {daysLeft}
            </Text>
            <Text className={styles.daysText} style={{ color }}>
              days left
            </Text>
          </div>
        </>
      )}
    </div>
  );
};

const PlanInfo = ({ apiServiceLevel, currentEvents, maxEvents }) => {
  const color = getColorByEventsUsed(currentEvents, maxEvents);

  return (
    <div className={styles.info}>
      <div className={styles.eventsUsage}>
        <div className={styles.eventsCount}>
          <Text className={styles.eventsNumber} style={{ color }}>
            {currentEvents?.toLocaleString()}
          </Text>
          <Text className={styles.eventsLabel}>events</Text>
        </div>
        <Text className={styles.usageText}>used this month</Text>
      </div>
      <UsageProgress apiServiceLevel={apiServiceLevel} currentEvents={currentEvents} maxEvents={maxEvents} />
      <Text variant="secondary" fontSize="12px" color="typography.text.secondary">
        Updates every hour
      </Text>
    </div>
  );
};

const PlanActions = ({ trialEnd, status, selectedBillingInterval }) => {
  return (
    <div className={styles.actions}>
      <PlanActionButton selectedBillingInterval={selectedBillingInterval} />
      {status === 'trialing' ? (
        <Text variant="secondary" fontSize="12px" color="typography.text.secondary">
          Trial ends on {formatDate(trialEnd)}
        </Text>
      ) : null}
    </div>
  );
};

const getColorByEventsUsed = (eventsUsed: number, maxEvents: number) => {
  const percentage = (eventsUsed / maxEvents) * 100;
  if (percentage >= 100) return '#F2555A';
  if (percentage >= 90) return '#FFB224';

  return undefined;
};

const getColorByDaysLeft = (daysLeft: number) => {
  if (daysLeft <= 0) return '#F2555A';
  if (daysLeft <= 3) return '#FFB224';

  return undefined;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
};

const styles = {
  activePlanWrapper: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '16px',
    alignSelf: 'stretch',
  }),
  banner: css({
    display: 'flex',
    width: '100%',
    padding: '24px',
    alignItems: 'flex-start',
    borderRadius: '16px',
    background: 'surface.panel',
    boxShadow: '0px 5px 20px 0px rgba(0, 0, 0, 0.2)',
    marginBottom: '24px',
  }),
  content: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '24px',
    flex: '1 0 0',
  }),
  header: css({
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  }),
  trialBadge: (theme: MantineTheme) =>
    css({
      // TODO: replace with 'mauve.80' color token when legacy tokens are removed
      background: theme.colorScheme === 'dark' ? '#2E2E32 !important' : '#e9e8eaff !important',
      padding: '2px 8px !important',
      color: theme.colorScheme === 'dark' ? '#7E7D86' : '#86848dff',
      fontSize: '12px !important',
    }),
  daysLeft: css({
    display: 'flex',
    gap: '6px',
    alignItems: 'baseline',
  }),
  daysNumber: css({
    color: 'typography.text.secondary',
    fontSize: '20px',
    fontWeight: '600',
  }),
  daysText: css({
    color: 'typography.text.secondary',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '1',
  }),
  info: css({
    display: 'flex',
    width: '240px',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
  }),
  eventsUsage: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  }),
  eventsCount: css({
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
  }),
  eventsNumber: css({
    fontSize: '16px',
    fontWeight: '600',
    lineHeight: '24px',
    color: 'typography.text.primary',
  }),
  eventsLabel: css({
    color: 'typography.text.secondary',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  }),
  usageText: css({
    color: 'typography.text.secondary',
    fontSize: '14px',
    fontWeight: '400',
    lineHeight: '20px',
  }),
  usageFootnote: css({
    color: 'typography.text.secondary',
    fontSize: '12px',
    fontWeight: '400',
    lineHeight: '12px',
  }),
  actions: css({
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    alignSelf: 'stretch',
  }),
  manageSubscriptionButton: {
    root: css({
      height: '32px !important',
      padding: '0px 12px !important',
      borderRadius: '8px !important',
      background: 'transparent !important',
      border: '1px solid #2A92E7 !important',
      color: '#2A92E7 !important',
    }),
    label: css({
      fontSize: '14px !important',
      fontWeight: '400 !important',
      lineHeight: '20px !important',
    }),
  },
};
