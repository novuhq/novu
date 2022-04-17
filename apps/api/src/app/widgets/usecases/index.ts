import { GetEnvironmentData } from './get-environment-data/get-environment-data.usecase';
import { MarkMessageAsSeen } from './mark-message-as-seen/mark-message-as-seen.usecase';
import { GetUnseenCount } from './get-unseen-count/get-unseen-count.usecase';
import { GetNotificationsFeed } from './get-notifications-feed/get-notifications-feed.usecase';
import { InitializeSession } from './initialize-session/initialize-session.usecase';
import { GetWidgetSettings } from './get-widget-settings/get-widget-settings.usecase';

export const USE_CASES = [
  GetEnvironmentData,
  MarkMessageAsSeen,
  GetUnseenCount,
  GetNotificationsFeed,
  InitializeSession,
  GetWidgetSettings,
  //
];
