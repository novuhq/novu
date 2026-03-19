import { ContextId, ContextType, createContextKey, FeatureFlagsKeysEnum } from '@novu/shared';
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
import { ActivityFiltersData } from '@/types/activity';
import { buildRoute, ROUTES } from '@/utils/routes';

const getInitialFilters = (contextKey: string, dateRange?: string): ActivityFiltersData => ({
  ...defaultActivityFilters,
  dateRange: dateRange || '24h',
  contextKeys: [contextKey],
});

export const ContextActivity = ({ type, id }: { type: ContextType; id: ContextId }) => {
  const { currentEnvironment } = useEnvironment();
  const isHttpLogsPageEnabled = useFeatureFlag(FeatureFlagsKeysEnum.IS_HTTP_LOGS_PAGE_ENABLED, false);
  const contextKey = createContextKey(type, id);

  const [filters, setFilters] = useState<ActivityFiltersData>(() => getInitialFilters(contextKey));
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
    setFilters(getInitialFilters(contextKey));
  };

  const hasChangesInFilters = useMemo(() => {
    return (
      filters.channels.length > 0 ||
      filters.workflows.length > 0 ||
      filters.transactionId !== defaultActivityFilters.transactionId ||
      filters.subscriberId !== defaultActivityFilters.subscriberId ||
      filters.topicKey !== defaultActivityFilters.topicKey ||
      filters.severity.length > 0
    );
  }, [filters]);

  const searchParams = useMemo(() => {
    const params = new URLSearchParams();

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
  }, [filters]);

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
          hide={['dateRange', 'contextKeys']}
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
