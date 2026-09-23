import type { SeverityLevelEnum, TagsFilter } from '@novu/shared';

export type { InboxPreference } from '@novu/application-generic';

export type NotificationFilter = {
  tags?: TagsFilter;
  read?: boolean;
  archived?: boolean;
  snoozed?: boolean;
  seen?: boolean;
  data?: string;
  severity?: SeverityLevelEnum | SeverityLevelEnum[];
  createdGte?: number;
  createdLte?: number;
};
