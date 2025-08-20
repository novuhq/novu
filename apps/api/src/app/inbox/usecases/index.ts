import {
  GetSubscriberTemplatePreference,
  GetWorkflowByIdsUseCase,
  MessageInteractionService,
  StorageHelperService,
  UpsertControlValuesUseCase,
  WorkflowRunService,
} from '@novu/application-generic';
import { CommunityUserRepository } from '@novu/dal';
import { GenerateUniqueApiKey } from '../../environments-v1/usecases/generate-unique-api-key/generate-unique-api-key.usecase';
import { ParseEventRequest } from '../../events/usecases/parse-event-request';
import { VerifyPayload } from '../../events/usecases/verify-payload';
import { GetSubscriberGlobalPreference } from '../../subscribers/usecases/get-subscriber-global-preference';
import { BulkUpdatePreferences } from './bulk-update-preferences/bulk-update-preferences.usecase';
import { GetInboxPreferences } from './get-inbox-preferences/get-inbox-preferences.usecase';
import { GetNotifications } from './get-notifications/get-notifications.usecase';
import { MarkManyNotificationsAs } from './mark-many-notifications-as/mark-many-notifications-as.usecase';
import { MarkNotificationAs } from './mark-notification-as/mark-notification-as.usecase';
import { MarkNotificationsAsSeen } from './mark-notifications-as-seen/mark-notifications-as-seen.usecase';
import { NotificationsCount } from './notifications-count/notifications-count.usecase';
import { Session } from './session/session.usecase';
import { SnoozeNotification } from './snooze-notification/snooze-notification.usecase';
import { UnsnoozeNotification } from './unsnooze-notification/unsnooze-notification.usecase';
import { UpdateAllNotifications } from './update-all-notifications/update-all-notifications.usecase';
import { UpdateNotificationAction } from './update-notification-action/update-notification-action.usecase';
import { UpdatePreferences } from './update-preferences/update-preferences.usecase';

export const USE_CASES = [
  Session,
  NotificationsCount,
  GetNotifications,
  MarkManyNotificationsAs,
  MarkNotificationAs,
  MarkNotificationsAsSeen,
  UpdateNotificationAction,
  UpdateAllNotifications,
  GetInboxPreferences,
  GetSubscriberGlobalPreference,
  GetSubscriberTemplatePreference,
  GetWorkflowByIdsUseCase,
  UpdatePreferences,
  BulkUpdatePreferences,
  SnoozeNotification,
  UnsnoozeNotification,
  GenerateUniqueApiKey,
  CommunityUserRepository,
  UpsertControlValuesUseCase,
  ParseEventRequest,
  VerifyPayload,
  StorageHelperService,
  MessageInteractionService,
  WorkflowRunService,
];
