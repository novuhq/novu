import { GetOrganizationData } from './get-organization-data/get-organization-data.usecase';
import { MarkMessageAsSeen } from './mark-message-as-seen/mark-message-as-seen.usecase';
import { GetUnseenCount } from './get-unseen-count/get-unseen-count.usecase';
import { GetNotificationsFeed } from './get-notifications-feed/get-notifications-feed.usecase';
import { InitializeSession } from './initialize-session/initialize-session.usecase';
import { GetWidgetSettings } from './get-widget-settings/get-widget-settings.usecase';
import { UpdateMessageActions } from './mark-action-as-done/update-message-actions.usecause';
import { GetSubscriberPreference } from './get-subscriber-preference/get-subscriber-preference.usecase';
import { UpdateSubscriberPreference } from './update-subscriber-preference/update-subscriber-preference.usecase';
import { BuildSubscriberPreferenceTemplate } from './build-subscriber-preference-template';

export const USE_CASES = [
  GetOrganizationData,
  MarkMessageAsSeen,
  UpdateMessageActions,
  GetUnseenCount,
  GetNotificationsFeed,
  InitializeSession,
  GetWidgetSettings,
  GetSubscriberPreference,
  UpdateSubscriberPreference,
  BuildSubscriberPreferenceTemplate,
  //
];
