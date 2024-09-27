import { Text, Title } from '@novu/novui';
import { Badge, Button, useMantineTheme } from '@mantine/core';
import { css } from '@novu/novui/css';
import { UsageProgress } from './UsageProgress';
import { errorMessage } from '@novu/design-system';
import { useMutation } from '@tanstack/react-query';
import { api } from '../../../api';
import { useSegment } from '../../../components/providers/SegmentProvider';
import { useSubscriptionContext } from './SubscriptionProvider';

export const ActivePlanBanner = () => {
  const { apiServiceLevel, status, events, trial } = useSubscriptionContext();

  return (
    <div className={styles.activePlanWrapper}>
      <Title variant="section">Active Plan</Title>
      <div className={styles.banner}>
        <div className={styles.content}>
          <PlanHeader apiServiceLevel={apiServiceLevel} isFreeTrialActive={trial.isActive} daysLeft={trial.daysLeft} />
          <PlanInfo apiServiceLevel={apiServiceLevel} currentEvents={events.current} maxEvents={events.included} />
        </div>
        <PlanActions trialEnd={trial.end} status={status} />
      </div>
    </div>
  );
};

const PlanHeader = ({ apiServiceLevel, isFreeTrialActive, daysLeft }) => {
  const color = getColorByDaysLeft(daysLeft);
  const theme = useMantineTheme();

  return (
    <div className={styles.header}>
      <Title variant="section">{capitalizeFirstLetter(apiServiceLevel)}</Title>
      {isFreeTrialActive && (
        <>
          <Badge size="sm" className={styles.trialBadge(theme)}>
            Trial
          </Badge>
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
            {currentEvents.toLocaleString()}
          </Text>
          <Text className={styles.eventsLabel}>events</Text>
        </div>
        <Text className={styles.usageText}>used this month</Text>
      </div>

      <UsageProgress apiServiceLevel={apiServiceLevel} currentEvents={currentEvents} maxEvents={maxEvents} />
    </div>
  );
};

const PlanActions = ({ trialEnd, status }) => {
  const segment = useSegment();

  const handleManageSubscription = () => {
    segment.track('Manage Subscription Clicked - Plans List');
    goToPortal({});
  };

  const { mutateAsync: goToPortal, isLoading: isGoingToPortal } = useMutation<any, any, any>(
    () => api.get('/v1/billing/portal'),
    {
      onSuccess: (url) => {
        window.location.href = url;
      },
      onError: (e: any) => {
        errorMessage(e.message || 'Unexpected error');
      },
    }
  );

  return (
    <div className={styles.actions}>
      {status === 'active' ? (
        <Button
          classNames={styles.manageSubscriptionButton}
          onClick={handleManageSubscription}
          loading={isGoingToPortal}
        >
          Manage subscription
        </Button>
      ) : null}
      {status === 'trialing' ? (
        <Text variant="secondary" fontSize="14px" color="typography.text.secondary">
          Trial ends on {formatDate(trialEnd)}
        </Text>
      ) : null}
    </div>
  );
};

// Helper functions
const capitalizeFirstLetter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

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
  trialBadge: (theme) =>
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
