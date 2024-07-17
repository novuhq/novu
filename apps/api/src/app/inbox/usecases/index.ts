import { GetSubscriberGlobalPreference, GetSubscriberTemplatePreference } from '@novu/application-generic';
import { GetNotifications } from './get-notifications/get-notifications.usecase';
import { GetPreferences } from './get-preferences/get-preferences.usecase';
import { MarkManyNotificationsAs } from './mark-many-notifications-as/mark-many-notifications-as.usecase';
import { MarkNotificationAs } from './mark-notification-as/mark-notification-as.usecase';
import { NotificationsCount } from './notifications-count/notifications-count.usecase';
import { Session } from './session/session.usecase';
import { UpdateAllNotifications } from './update-all-notifications/update-all-notifications.usecase';
import { UpdateNotificationAction } from './update-notification-action/update-notification-action.usecase';

export const USE_CASES = [
  Session,
  NotificationsCount,
  GetNotifications,
  MarkManyNotificationsAs,
  MarkNotificationAs,
  UpdateNotificationAction,
  UpdateAllNotifications,
  GetPreferences,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
];
