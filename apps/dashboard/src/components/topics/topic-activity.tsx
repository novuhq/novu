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

const getInitialFilters = (topicKey: string, dateRange: string): ActivityFiltersData => ({
  channels: [],
  dateRange: dateRange || '24h',
  subscriberId: '',
  transactionId: '',
  workflows: [],
  topicKey,
  severity: [],
  contextKeys: [],
  subscriptionId: '',
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
      (filters.subscriberId !== defaultActivityFilters.subscriberId && filters.subscriberId !== '') ||
      filters.contextKeys.length > 0
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

    if (filters.severity.length > 0) {
      params.set('severity', filters.severity.join(','));
    }

    if (filters.contextKeys.length > 0) {
      for (const contextKey of filters.contextKeys) {
        params.append('contextKeys', contextKey);
      }
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
            className="px-2.5 pt-2.5"
          />
          <SubscriberActivityList
            isLoading={isLoading}
            activities={activities}
            hasChangesInFilters={hasChangesInFilters}
            onClearFilters={handleClearFilters}
            onActivitySelect={handleActivitySelect}
            emptyFiltersDescription="Subscribers in this topic haven't received any notifications yet. Once a workflow is triggered for this topic, you'll see their notification history and delivery details here."
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
      </div>
    </AnimatePresence>
  );
};
