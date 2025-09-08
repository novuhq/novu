import { ChannelTypeEnum, SeverityLevelEnum } from '@novu/shared';
import { ActivityFilters } from '@/api/activity';

export type ActivityFiltersData = {
  dateRange: string;
  channels: ChannelTypeEnum[];
  workflows: string[];
  transactionId: string;
  subscriberId: string;
  topicKey: string;
  severity: SeverityLevelEnum[];
};

export type ActivityUrlState = {
  activityItemId: string | null;
  filters: ActivityFilters;
  filterValues: ActivityFiltersData;
};
