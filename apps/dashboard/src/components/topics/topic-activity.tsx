import { ActivityFilters } from '@/components/activity/activity-filters';
import { defaultActivityFilters } from '@/components/activity/constants';
import { ActivityDetailsDrawer } from '@/components/subscribers/subscriber-activity-drawer';
import { SubscriberActivityList } from '@/components/subscribers/subscriber-activity-list';
import { useEnvironment } from '@/context/environment/hooks';
import { useFetchActivities } from '@/hooks/use-fetch-activities';
import { useFetchSubscription } from '@/hooks/use-fetch-subscription';
import { useFeatureFlag } from '@/hooks/use-feature-flag';
import { ActivityFiltersData } from '@/types/activity';
import { getMaxAvailableActivityFeedDateRange } from '@/utils/activityFilters';
import { buildRoute, ROUTES } from '@/utils/routes';
import { FeatureFlagsKeysEnum } from '@novu/shared';
import { useOrganization } from '@clerk/clerk-react';
import { AnimatePresence } from 'motion/react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

const getInitialFilters = (topicKey: string, dateRange: string): ActivityFiltersData => ({
  channels: [],
  dateRange: dateRange || '24h',
  subscriberId: '',
  transactionId: '',
  workflows: [],
  topicKey,
});

export const TopicActivity = ({ topicKey }: { topicKey: string }) => {
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
    getInitialFilters(topicKey, maxAvailableActivityFeedDateRange)
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
    setFilters(getInitialFilters(topicKey, maxAvailableActivityFeedDateRange));
  };

  const hasChangesInFilters = useMemo(() => {
    return (
      filters.channels.length > 0 ||
      filters.workflows.length > 0 ||
      filters.transactionId !== defaultActivityFilters.transactionId ||
      (filters.subscriberId !== defaultActivityFilters.subscriberId && filters.subscriberId !== '')
    );
  }, [filters]);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams({
      topicKey,
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

    if (filters.subscriberId) {
      params.set('subscriberId', filters.subscriberId);
    }

    return params;
  }, [topicKey, filters]);

  const handleActivitySelect = (activityId: string) => {
    setActivityItemId(activityId);
  };

  return (
    <AnimatePresence mode="wait">
      <div key="topic-activity-content" className="relative h-full">
        <div className="flex h-full flex-col">
          <ActivityFilters
            filters={filters}
            showReset={hasChangesInFilters}
            onFiltersChange={setFilters}
            onReset={handleClearFilters}
            hide={['dateRange', 'topicKey']}
            className="min-h-max overflow-x-auto"
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
              to={`${buildRoute(isHttpLogsPageEnabled ? ROUTES.ACTIVITY_RUNS : ROUTES.ACTIVITY_FEED, {
                environmentSlug: currentEnvironment?.slug ?? '',
              })}?${searchParams.toString()}`}
            >
              Activity Feed
            </Link>{' '}
            page.
          </span>
        </div>
        <ActivityDetailsDrawer activityId={activityItemId} onActivitySelect={handleActivitySelect} />
      </div>
    </AnimatePresence>
  );
};
