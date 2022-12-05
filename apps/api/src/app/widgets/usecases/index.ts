import { GetOrganizationData } from './get-organization-data/get-organization-data.usecase';
import { MarkMessageAs } from './mark-message-as/mark-message-as.usecase';
import { GetNotificationsFeed } from './get-notifications-feed/get-notifications-feed.usecase';
import { InitializeSession } from './initialize-session/initialize-session.usecase';
import { GetWidgetSettings } from './get-widget-settings/get-widget-settings.usecase';
import { UpdateMessageActions } from './mark-action-as-done/update-message-actions.usecase';
import { MarkAllMessageAsSeen } from './mark-all-message-as-seen/mark-all-message-as-seen.usecase';
import { GetFeedCount } from './get-feed-count/get-feed-count.usecase';

export const USE_CASES = [
  GetOrganizationData,
  UpdateMessageActions,
  MarkMessageAs,
  GetFeedCount,
  GetNotificationsFeed,
  InitializeSession,
  GetWidgetSettings,
  MarkAllMessageAsSeen,
  //
];
