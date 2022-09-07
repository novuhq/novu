import { GetOrganizationData } from './get-organization-data/get-organization-data.usecase';
import { MarkMessageAs } from './mark-message-as/mark-message-as.usecase';
import { GetUnseenCount } from './get-unseen-count/get-unseen-count.usecase';
import { GetNotificationsFeed } from './get-notifications-feed/get-notifications-feed.usecase';
import { InitializeSession } from './initialize-session/initialize-session.usecase';
import { GetWidgetSettings } from './get-widget-settings/get-widget-settings.usecase';
import { UpdateMessageActions } from './mark-action-as-done/update-message-actions.usecause';

export const USE_CASES = [
  GetOrganizationData,
  MarkMessageAs,
  UpdateMessageActions,
  GetUnseenCount,
  GetNotificationsFeed,
  InitializeSession,
  GetWidgetSettings,
  //
];
