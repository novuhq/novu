import { useOrganization } from '@clerk/clerk-react';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { AnimatePresence } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ActivityFilters } from '@/components/activity/activity-filters';
import { defaultActivityFilters } from '@/components/activity/constants';
import { ActivityDetailsDrawer } from '@/components/subscribers/subscriber-activity-drawer';
import { SubscriberActivityList } from '@/components/subscribers/subscriber-activity-list';
import { useEnvironment } from '@/context/environment/hooks';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { useFetchActivities } from '@/hooks/use-fetch-activities';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { ActivityFiltersData } from '@/types/activity';
import { getMaxAvailableActivityFeedDateRange } from '@/utils/activityFilters';
import { buildRoute, ROUTES } from '@/utils/routes';

const getInitialFilters = (subscriberId: string, dateRange: string): ActivityFiltersData => ({
  channels: [],
  dateRange: dateRange || '24h',
  subscriberId,
  transactionId: '',
  workflows: [],
  topicKey: '',
  severity: [],
  contextKeys: [],
  subscriptionId: '',
});

export const SubscriberActivity = ({ subscriberId }: { subscriberId: string }) => {
  const { organization } = useOrganization();
  const { currentEnvironment } = useEnvironment();
  const { subscription } = useFetchSubscription();
  const isHttpLogsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTTP_LOGS_PAGE_ENABLED, false);

  const maxAvailableActivityFeedDateRange = useMemo(
    () =>
      getMaxAvailableActivityFeedDateRange({
        organization,
        subscription,
      }),
    [organization, subscription]
  );

  const [filters, setFilters] = useState<ActivityFiltersData>(
    getInitialFilters(subscriberId, maxAvailableActivityFeedDateRange)
  );

  const [activityItemId, setActivityItemId] = useState<string>('');
  const { activities, isLoading } = useFetchActivities(
    {
      filters,
      page: 0,
      limit: 50,
    },
    {
      refetchOnWindowFocus: false,
    }
  );

  const handleClearFilters = () => {
    setFilters(getInitialFilters(subscriberId, maxAvailableActivityFeedDateRange));
  };

  const hasChangesInFilters = useMemo(() => {
    return (
      filters.channels.length > 0 ||
      filters.workflows.length > 0 ||
      filters.transactionId !== defaultActivityFilters.transactionId ||
      filters.topicKey !== defaultActivityFilters.topicKey ||
      filters.contextKeys.length > 0
    );
  }, [filters]);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({
      subscriberId,
    });

    if (filters.workflows.length > 0) {
      params.set('workflows', filters.workflows.join(','));
    }

    if (filters.channels.length > 0) {
      params.set('channels', filters.channels.join(','));
    }

    if (filters.transactionId) {
      params.set('transactionId', filters.transactionId);
    }

    if (filters.topicKey) {
      params.set('topicKey', filters.topicKey);
    }

    if (filters.severity.length > 0) {
      params.set('severity', filters.severity.join(','));
    }

    if (filters.contextKeys.length > 0) {
      for (const contextKey of filters.contextKeys) {
        params.append('contextKeys', contextKey);
      }
    }

    return params;
  }, [subscriberId, filters]);

  const handleActivitySelect = (activityId: string) => {
    setActivityItemId(activityId);
  };

  return (
    <AnimatePresence mode="wait">
      <div className="flex h-full flex-col">
        <ActivityFilters
          filters={filters}
          showReset={hasChangesInFilters}
          onFiltersChange={setFilters}
          onReset={handleClearFilters}
          hide={['dateRange', 'subscriberId']}
          className="py-2 px-2"
        />
        <SubscriberActivityList
          isLoading={isLoading}
          activities={activities}
          hasChangesInFilters={hasChangesInFilters}
          onClearFilters={handleClearFilters}
          onActivitySelect={handleActivitySelect}
        />
        <span className="text-paragraph-2xs text-text-soft border-border-soft mt-auto border-t p-3 text-center">
          To view more detailed activity, View{' '}
          <Link
            className="underline"
            to={`${buildRoute(isHttpLogsPageEnabled ? ROUTES.ACTIVITY_WORKFLOW_RUNS : ROUTES.ACTIVITY_FEED, {
              environmentSlug: currentEnvironment?.slug ?? '',
            })}?${searchParams.toString()}`}
          >
            Activity Feed
          </Link>{' '}
          page.
        </span>
      </div>
      <ActivityDetailsDrawer activityId={activityItemId} onActivitySelect={handleActivitySelect} />
    </AnimatePresence>
  );
};
