import { RiGroup2Fill } from 'react-icons/ri';
import type { MetricData } from '../../../hooks/use-metric-data';
import { InboxBellFilled } from '../../icons/inbox-bell-filled';
import { StackedDots } from '../../icons/stacked-dots';
import { TargetArrow } from '../../icons/target-arrow';
import { AnalyticsCard } from '../../primitives/analytics-card';
import { ANALYTICS_TOOLTIPS } from '../constants/analytics-tooltips';

type AnalyticsSectionProps = {
  messagesDeliveredData: MetricData;
  activeSubscribersData: MetricData;
  avgMessagesPerSubscriberData: MetricData;
  totalInteractionsData: MetricData;
  isLoading: boolean;
};

export function AnalyticsSection({
  messagesDeliveredData,
  activeSubscribersData,
  avgMessagesPerSubscriberData,
  totalInteractionsData,
  isLoading,
}: AnalyticsSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2">
      <AnalyticsCard
        icon={InboxBellFilled}
        value={messagesDeliveredData.value}
        title="Messages delivered"
        description={messagesDeliveredData.description}
        percentageChange={messagesDeliveredData.percentageChange}
        trendDirection={messagesDeliveredData.trendDirection}
        isLoading={isLoading}
        infoTooltip={ANALYTICS_TOOLTIPS.MESSAGES_DELIVERED}
      />

      <AnalyticsCard
        icon={RiGroup2Fill}
        value={activeSubscribersData.value}
        title="Active subscribers"
        description={activeSubscribersData.description}
        percentageChange={activeSubscribersData.percentageChange}
        trendDirection={activeSubscribersData.trendDirection}
        isLoading={isLoading}
        infoTooltip={ANALYTICS_TOOLTIPS.ACTIVE_SUBSCRIBERS}
      />

      <AnalyticsCard
        icon={TargetArrow}
        value={totalInteractionsData.value}
        title="<Inbox /> Interactions"
        description={totalInteractionsData.description}
        percentageChange={totalInteractionsData.percentageChange}
        trendDirection={totalInteractionsData.trendDirection}
        isLoading={isLoading}
        infoTooltip={ANALYTICS_TOOLTIPS.INTERACTIONS}
      />

      <AnalyticsCard
        icon={StackedDots}
        value={avgMessagesPerSubscriberData.value}
        title="Avg. Messages per subscriber"
        description={avgMessagesPerSubscriberData.description}
        percentageChange={avgMessagesPerSubscriberData.percentageChange}
        trendDirection={avgMessagesPerSubscriberData.trendDirection}
        isLoading={isLoading}
        infoTooltip={ANALYTICS_TOOLTIPS.AVG_MESSAGES_PER_SUBSCRIBER}
      />
    </div>
  );
}
