import { ChannelTypeEnum, SeverityLevelEnum } from '@novu/shared';
import { ActivityFilters } from '@/api/activity';
import type { ActivityDateRange } from '@/utils/activityFilters';

export type ActivityFiltersData = {
  dateRange: ActivityDateRange;
  channels: ChannelTypeEnum[];
  workflows: string[];
  transactionId: string;
  subscriberId: string;
  topicKey: string;
  subscriptionId: string;
  severity: SeverityLevelEnum[];
  contextKeys: string[];
};

export type ActivityUrlState = {
  activityItemId: string | null;
  filters: ActivityFilters;
  filterValues: ActivityFiltersData;
};
