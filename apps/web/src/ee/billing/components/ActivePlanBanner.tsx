import { Text, Title } from '@novu/novui';
import { MantineTheme } from '@mantine/core';
import { css } from '@novu/novui/css';
import { UsageProgress } from './UsageProgress';
import { useSubscriptionContext, type UseSubscriptionType } from './SubscriptionProvider';
import { capitalizeFirstLetter } from '../../../utils/string';
import { Badge } from './Badge';
import { PlanActionButton } from './PlanActionButton';
import { ApiServiceLevelEnum, FeatureFlagsKeysEnum } from '@novu/shared';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';

type BillingInterval = 'month' | 'year';

export const ActivePlanBanner = ({ selectedBillingInterval }: { selectedBillingInterval: BillingInterval }) => {
  const subscription = useSubscriptionContext();

  return (
    <div className={styles.activePlanWrapper}>
      <Title variant="section">Active Plan</Title>
      <div className={styles.banner}>
        <div className={styles.content}>
          <PlanHeader {...subscription} />
          <PlanInfo {...subscription} />
        </div>
        <PlanActions {...subscription} selectedBillingInterval={selectedBillingInterval} />
      </div>
    </div>
  );
};

function PlanHeader({ apiServiceLevel, trial }: UseSubscriptionType) {
  const { daysLeft, isActive } = trial;
  const color = getColorByDaysLeft(daysLeft);
  const is2025Q1TieringEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_2025_Q1_TIERING_ENABLED);

  const renameBusinessToTeam = (plan: string) => {
    if (plan === ApiServiceLevelEnum.BUSINESS && is2025Q1TieringEnabled) return 'team';

    return plan.toLowerCase();
  };

  return (
    <div className={styles.header}>
      <Title variant="section">{capitalizeFirstLetter(renameBusinessToTeam(apiServiceLevel))}</Title>
      {isActive && (
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
}

function PlanInfo({ apiServiceLevel, events, currentPeriodStart, currentPeriodEnd }: UseSubscriptionType) {
  const { current: currentEvents, included: maxEvents } = events;
  const color = getColorByEventsUsed(currentEvents, maxEvents);

  return (
    <div className={styles.info}>
      <div className={styles.eventsUsage}>
        <div className={styles.eventsCount}>
          <Text className={styles.eventsLabel}>
            <Text as="span" color="typography.text.primary" className={styles.eventsNumber} style={{ color }}>
              {currentEvents?.toLocaleString()}
            </Text>{' '}
            events used between {formatDate(currentPeriodStart || '2024')} and {formatDate(currentPeriodEnd || '2024')}.
          </Text>
        </div>
      </div>
      <UsageProgress apiServiceLevel={apiServiceLevel} currentEvents={currentEvents} maxEvents={maxEvents} />
      <Text variant="secondary" fontSize="12px" color="typography.text.secondary">
        Updates every hour
      </Text>
    </div>
  );
}

function PlanActions({
  trial,
  status,
  selectedBillingInterval,
}: UseSubscriptionType & { selectedBillingInterval: BillingInterval }) {
  return (
    <div className={styles.actions}>
      <PlanActionButton selectedBillingInterval={selectedBillingInterval} />
      {status === 'trialing' && trial.end && (
        <Text variant="secondary" fontSize="12px" color="typography.text.secondary">
          Trial ends on {formatDate(trial.end)}
        </Text>
      )}
    </div>
  );
}

const getColorByEventsUsed = (eventsUsed: number, maxEvents?: number | null) => {
  if (!eventsUsed || !maxEvents) return undefined;

  const percentage = (eventsUsed / maxEvents) * 100;
  if (percentage >= 100) return '#F2555A';
  if (percentage >= 80) return '#FFB224';

  return undefined;
};

const getColorByDaysLeft = (daysLeft: number) => {
  if (daysLeft <= 0) return '#F2555A';
  if (daysLeft <= 3) return '#FFB224';

  return undefined;
};

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
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
    width: '340px',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: '8px',
  }),
  eventsUsage: css({
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    lineHeight: '24px',
  }),
  eventsCount: css({
    display: 'flex',
    alignItems: 'flex-end',
    gap: '4px',
  }),
  eventsNumber: css({
    fontSize: '16px',
    fontWeight: '600',
  }),
  eventsLabel: css({
    color: 'typography.text.secondary',
    fontSize: '14px',
    fontWeight: '400',
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
