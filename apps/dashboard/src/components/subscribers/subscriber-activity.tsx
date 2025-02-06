import { useMemo, useState } from 'react';
import { AnimatePresence } from 'motion/react';

import { ActivityFilters } from '@/components/activity/activity-filters';
import { defaultActivityFilters } from '@/components/activity/constants';
import { ActivityFiltersData } from '@/types/activity';
import { useFetchActivities } from '@/hooks/use-fetch-activities';
import { SubscriberActivityList } from '@/components/subscribers/subscriber-activity-list';

const getInitialFilters = (subscriberId: string): ActivityFiltersData => ({
  dateRange: '30d',
  channels: [],
  workflows: [],
  transactionId: '',
  subscriberId,
});

export const SubscriberActivity = ({ subscriberId }: { subscriberId: string }) => {
  const [filters, setFilters] = useState<ActivityFiltersData>(getInitialFilters(subscriberId));

  const { activities, isLoading } = useFetchActivities(
    {
      filters,
      page: 0,
      limit: 50,
    },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const handleClearFilters = () => {
    setFilters(getInitialFilters(subscriberId));
  };

  const hasChangesInFilters = useMemo(() => {
    return (
      filters.channels.length > 0 ||
      filters.workflows.length > 0 ||
      filters.transactionId !== defaultActivityFilters.transactionId
    );
  }, [filters]);

  return (
    <AnimatePresence mode="wait">
      <div className="flex h-full flex-col">
        <ActivityFilters
          filters={filters}
          showReset={hasChangesInFilters}
          onFiltersChange={setFilters}
          onReset={handleClearFilters}
          hide={['dateRange', 'subscriberId']}
          className="min-h-max overflow-x-auto"
        />
        <SubscriberActivityList
          isLoading={isLoading}
          activities={activities}
          hasChangesInFilters={hasChangesInFilters}
          onClearFilters={handleClearFilters}
        />
      </div>
    </AnimatePresence>
  );
};
