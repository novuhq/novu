import { Session } from './session/session.usecase';
import { NotificationsCount } from './notifications-count/notifications-count.usecase';
import { GetNotifications } from './get-notifications/get-notifications.usecase';
import { UpdateNotification } from './update-notification/update-notification.usecase';

export const USE_CASES = [Session, NotificationsCount, GetNotifications, UpdateNotification];
