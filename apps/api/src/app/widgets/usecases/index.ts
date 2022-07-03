import { GetOrganizationData } from './get-organization-data/get-organization-data.usecase';
import { MarkMessageAsSeen } from './mark-message-as-seen/mark-message-as-seen.usecase';
import { GetUnseenCount } from './get-unseen-count/get-unseen-count.usecase';
import { GetNotificationsFeed } from './get-notifications-feed/get-notifications-feed.usecase';
import { InitializeSession } from './initialize-session/initialize-session.usecase';
import { GetWidgetSettings } from './get-widget-settings/get-widget-settings.usecase';
import { GetFeeds } from './get-feeds/get-feeds.usecase';

export const USE_CASES = [
  GetOrganizationData,
  MarkMessageAsSeen,
  GetUnseenCount,
  GetNotificationsFeed,
  InitializeSession,
  GetWidgetSettings,
  GetFeeds,
  //
];
